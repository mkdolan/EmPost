import {
	buildCanonicalString,
	canonicalIngestBodyBytes,
	DEFAULT_CONVERSION_MS,
	DEFAULT_MAX_BODY_BYTES,
	DEFAULT_MAX_FRONTMATTER_BYTES,
	DEFAULT_MAX_REQUEST_BYTES,
	DEFAULT_SKEW_SECONDS,
	hmacSha256Hex,
	IDEMPOTENCY_TTL_MS,
	jsonIngestBodySchema,
	markdownToPortableTextBlocks,
	parseAuthorizationHeader,
	parseMarkdownDocument,
	sha256Hex,
	slugFromTitle,
	timingSafeEqualHex,
} from "@emplugins/shared";
import { definePlugin, PluginRouteError, type PluginContext, type RouteContext } from "emdash";

async function numSetting(ctx: PluginContext, key: string, fallback: number): Promise<number> {
	const v = await ctx.kv.get<number>(`settings:${key}`);
	return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}

async function hashKey(s: string): Promise<string> {
	const d = await sha256Hex(new TextEncoder().encode(s));
	return d.slice(0, 32);
}

type KvSetOptions = { ttlMs?: number; expirationTtlMs?: number; expireInMs?: number; expiresInMs?: number };
async function kvSetBestEffort(ctx: RouteContext, key: string, value: unknown, ttlMs?: number) {
	// EmDash KV implementations may support TTL options; keep compatibility if they don't.
	if (!ttlMs || ttlMs <= 0) return ctx.kv.set(key, value);
	const kvAny = ctx.kv as unknown as { set: (k: string, v: unknown, o?: KvSetOptions) => Promise<void> };
	try {
		await kvAny.set(key, value, { ttlMs });
	} catch {
		try {
			await kvAny.set(key, value, { expirationTtlMs: ttlMs });
		} catch {
			try {
				await kvAny.set(key, value, { expireInMs: ttlMs });
			} catch {
				try {
					await kvAny.set(key, value, { expiresInMs: ttlMs });
				} catch {
					await ctx.kv.set(key, value);
				}
			}
		}
	}
}

async function ingestHandler(ctx: RouteContext) {
	if (ctx.request.method !== "POST") {
		throw PluginRouteError.badRequest("Use POST");
	}

	const pathname = new URL(ctx.request.url).pathname;
	const ip = ctx.requestMeta?.ip ?? "unknown";

	const maxReq = await numSetting(ctx, "maxRequestBytes", DEFAULT_MAX_REQUEST_BYTES);
	const maxFm = await numSetting(ctx, "maxFrontmatterBytes", DEFAULT_MAX_FRONTMATTER_BYTES);
	const maxBody = await numSetting(ctx, "maxBodyBytes", DEFAULT_MAX_BODY_BYTES);
	const conversionMs = await numSetting(ctx, "conversionMs", DEFAULT_CONVERSION_MS);
	const skewSec = await numSetting(ctx, "skewSeconds", DEFAULT_SKEW_SECONDS);
	const draftsPerMin = await numSetting(ctx, "draftsPerMinutePerKey", 30);
	const draftsPerDay = await numSetting(ctx, "draftsPerDayPerKey", 500);
	const reqPerMinIp = await numSetting(ctx, "requestsPerMinutePerIp", 120);

	const secret = await ctx.kv.get<string>("settings:hmacSecret");
	if (!secret || secret.length < 16) {
		throw new PluginRouteError("NOT_CONFIGURED", "Set HMAC signing secret in plugin settings", 503);
	}

	const expectedKeyId = (await ctx.kv.get<string>("settings:expectedKeyId")) ?? "default";

	const bodyObj = ctx.input;
	if (bodyObj == null || typeof bodyObj !== "object") {
		throw PluginRouteError.badRequest("JSON body required");
	}

	const parsedBody = jsonIngestBodySchema.safeParse(bodyObj);
	if (!parsedBody.success) {
		throw PluginRouteError.badRequest("Invalid body", parsedBody.error.format());
	}
	const { markdown } = parsedBody.data;

	const mdBytes = new TextEncoder().encode(markdown);
	if (mdBytes.byteLength > maxReq) {
		throw PluginRouteError.badRequest("Payload too large");
	}

	const auth = parseAuthorizationHeader(ctx.request.headers.get("Authorization"));
	if (!auth) {
		throw PluginRouteError.unauthorized();
	}
	if (auth.keyId !== expectedKeyId) {
		throw PluginRouteError.unauthorized();
	}

	const tsNum = Number.parseInt(auth.ts, 10);
	if (!Number.isFinite(tsNum)) {
		throw PluginRouteError.unauthorized();
	}
	const skewMs = skewSec * 1000;
	if (Math.abs(Date.now() - tsNum * 1000) > skewMs) {
		throw PluginRouteError.unauthorized();
	}

	const bodyBytes = canonicalIngestBodyBytes(markdown);
	if (bodyBytes.byteLength > maxBody) {
		throw PluginRouteError.badRequest("Markdown body too large");
	}

	const bodyHash = await sha256Hex(bodyBytes);
	const canonical = buildCanonicalString(auth.ts, auth.nonce, "POST", pathname, bodyHash);
	const expectedSig = await hmacSha256Hex(secret, canonical);
	if (!timingSafeEqualHex(expectedSig, auth.signatureHex)) {
		throw PluginRouteError.unauthorized();
	}

	const idemHeader = ctx.request.headers.get("Idempotency-Key")?.trim();
	if (idemHeader) {
		const idemKey = `state:idem:${auth.keyId}:${await hashKey(idemHeader)}`;
		const cached = await ctx.kv.get<{ contentId: string; slug: string; createdAt: number }>(idemKey);
		if (cached?.contentId && Date.now() - cached.createdAt < IDEMPOTENCY_TTL_MS) {
			return {
				ok: true,
				idempotent: true,
				contentId: cached.contentId,
				slug: cached.slug,
				adminUrl: ctx.url(`/_emdash/admin`),
			};
		}
	}

	const nonceKey = `state:nonce:${auth.nonce}`;
	if (await ctx.kv.get(nonceKey)) {
		throw PluginRouteError.unauthorized();
	}
	// Nonce only needs to live for the skew window (+ small buffer).
	await kvSetBestEffort(ctx, nonceKey, "1", skewMs + 60_000);

	const minute = Math.floor(Date.now() / 60_000);
	const day = new Date().toISOString().slice(0, 10);
	const ipRlKey = `state:rl:ipreq:${ip}:${minute}`;
	const ipCount = (await ctx.kv.get<number>(ipRlKey)) ?? 0;
	if (ipCount >= reqPerMinIp) {
		throw PluginRouteError.forbidden("Rate limited");
	}
	await kvSetBestEffort(ctx, ipRlKey, ipCount + 1, 2 * 60_000);

	let doc;
	try {
		doc = parseMarkdownDocument(markdown);
	} catch (e) {
		throw PluginRouteError.badRequest(e instanceof Error ? e.message : "Invalid markdown");
	}

	let fmRegion = "";
	if (markdown.startsWith("---")) {
		const end = markdown.indexOf("\n---", 3);
		if (end !== -1) fmRegion = markdown.slice(0, end + 4);
	}
	if (new TextEncoder().encode(fmRegion).byteLength > maxFm) {
		throw PluginRouteError.badRequest("Frontmatter too large");
	}

	const { blocks } = markdownToPortableTextBlocks(doc.body, conversionMs);

	if (!ctx.content?.create) {
		throw PluginRouteError.internal("write:content unavailable");
	}

	const baseSlug = doc.frontmatter.slug ?? slugFromTitle(doc.frontmatter.title);
	let slug = baseSlug;
	for (let attempt = 0; attempt < 8; attempt++) {
		const list = await ctx.content.list(doc.frontmatter.collection, { limit: 50 });
		const taken = list.items.some((it) => it.slug === slug);
		if (!taken) break;
		slug = `${baseSlug}-${attempt + 2}`;
	}

	const write: Record<string, unknown> = {
		title: doc.frontmatter.title,
		slug,
		status: "draft",
		content: blocks,
	};
	if (doc.frontmatter.excerpt) write.excerpt = doc.frontmatter.excerpt;
	if (doc.frontmatter.seo) write.seo = doc.frontmatter.seo;

	const keyId = auth.keyId;
	const dMinKey = `state:rl:draftmin:${keyId}:${minute}`;
	const dDayKey = `state:rl:draftday:${keyId}:${day}`;
	const curMin = (await ctx.kv.get<number>(dMinKey)) ?? 0;
	const curDay = (await ctx.kv.get<number>(dDayKey)) ?? 0;
	if (curMin >= draftsPerMin || curDay >= draftsPerDay) {
		throw PluginRouteError.forbidden("Draft quota exceeded");
	}

	let item;
	try {
		item = await ctx.content.create(doc.frontmatter.collection, write);
	} catch (e) {
		ctx.log.error("content.create failed", { err: String(e) });
		throw PluginRouteError.badRequest("Could not create draft");
	}

	await kvSetBestEffort(ctx, dMinKey, curMin + 1, 2 * 60_000);
	await kvSetBestEffort(ctx, dDayKey, curDay + 1, 2 * 24 * 60 * 60_000);

	const contentId = item.id;

	if (idemHeader) {
		const idemKey = `state:idem:${auth.keyId}:${await hashKey(idemHeader)}`;
		await kvSetBestEffort(ctx, idemKey, { contentId, slug, createdAt: Date.now() }, IDEMPOTENCY_TTL_MS);
	}

	ctx.log.info("ingest draft created", { contentId, slug, collection: doc.frontmatter.collection });

	return {
		ok: true,
		contentId,
		slug,
		collection: doc.frontmatter.collection,
		adminUrl: ctx.url(`/_emdash/admin`),
	};
}

async function healthHandler(ctx: RouteContext) {
	return { ok: true, plugin: ctx.plugin.id, version: ctx.plugin.version };
}

/**
 * Native EmDash plugin factory (used by the integration virtual module).
 */
export function createPlugin(_options: Record<string, unknown> = {}) {
	return definePlugin({
		id: "empost-md-draft",
		version: "0.1.0",
		capabilities: ["write:content"],
		admin: {
			settingsSchema: {
				hmacSecret: {
					type: "secret",
					label: "HMAC signing secret",
					description: "Shared secret for MCP / agent clients (min 16 characters).",
				},
				expectedKeyId: {
					type: "string",
					label: "Expected key id",
					description: "Must match the keyId sent in Authorization (default: default).",
					default: "default",
				},
				maxRequestBytes: {
					type: "number",
					label: "Max request bytes",
					default: DEFAULT_MAX_REQUEST_BYTES,
					min: 4096,
					max: 2 * 1024 * 1024,
				},
				maxFrontmatterBytes: {
					type: "number",
					label: "Max frontmatter bytes",
					default: DEFAULT_MAX_FRONTMATTER_BYTES,
					min: 1024,
					max: 256 * 1024,
				},
				maxBodyBytes: {
					type: "number",
					label: "Max markdown body bytes",
					default: DEFAULT_MAX_BODY_BYTES,
					min: 4096,
					max: 2 * 1024 * 1024,
				},
				conversionMs: {
					type: "number",
					label: "Markdown→PT time budget (ms)",
					default: DEFAULT_CONVERSION_MS,
					min: 200,
					max: 30_000,
				},
				skewSeconds: {
					type: "number",
					label: "HMAC max clock skew (seconds)",
					default: DEFAULT_SKEW_SECONDS,
					min: 30,
					max: 3600,
				},
				draftsPerMinutePerKey: {
					type: "number",
					label: "Drafts per minute (per key id)",
					default: 30,
					min: 1,
					max: 500,
				},
				draftsPerDayPerKey: {
					type: "number",
					label: "Drafts per day (per key id)",
					default: 500,
					min: 1,
					max: 50_000,
				},
				requestsPerMinutePerIp: {
					type: "number",
					label: "Ingest requests per minute (per IP)",
					default: 120,
					min: 1,
					max: 10_000,
				},
			},
		},
		routes: {
			health: {
				public: true,
				handler: healthHandler,
			},
			ingest: {
				public: true,
				handler: ingestHandler,
			},
		},
	});
}
