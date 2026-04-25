import { buildCanonicalString, canonicalIngestBodyBytes, hmacSha256Hex, sha256Hex } from "@emplugins/shared";
import { randomUUID } from "node:crypto";

export type IngestEnv = {
	ingestUrl: string;
	hmacSecret: string;
	keyId: string;
};

export type IngestResult = {
	ok: boolean;
	status: number;
	body: unknown;
	rawText: string;
};

function requireEnv(name: string): string {
	const v = process.env[name]?.trim();
	if (!v) throw new Error(`Missing required environment variable: ${name}`);
	return v;
}

export function loadIngestEnv(): IngestEnv {
	return {
		ingestUrl: requireEnv("EMDASH_INGEST_URL"),
		hmacSecret: requireEnv("EMDASH_HMAC_SECRET"),
		keyId: process.env.EMDASH_KEY_ID?.trim() || "default",
	};
}

export async function signAndPostIngest(
	env: IngestEnv,
	markdown: string,
	options?: { idempotencyKey?: string },
): Promise<IngestResult> {
	const url = new URL(env.ingestUrl);
	if (url.pathname.length < 2) {
		throw new Error("EMDASH_INGEST_URL must include the full ingest path");
	}
	if (url.protocol !== "https:" && !(url.protocol === "http:" && (url.hostname === "localhost" || url.hostname === "127.0.0.1"))) {
		throw new Error("EMDASH_INGEST_URL must be https (http allowed only for localhost)");
	}

	const bodyBytes = canonicalIngestBodyBytes(markdown);
	const bodyStr = new TextDecoder().decode(bodyBytes);
	const bodyHash = await sha256Hex(bodyBytes);

	const ts = Math.floor(Date.now() / 1000).toString();
	const nonce = randomUUID();
	const canonical = buildCanonicalString(ts, nonce, "POST", url.pathname, bodyHash);
	const signature = await hmacSha256Hex(env.hmacSecret, canonical);
	const auth = `HMAC-SHA256 keyId=${env.keyId}, ts=${ts}, nonce=${nonce}, signature=${signature}`;

	const headers: Record<string, string> = {
		"Content-Type": "application/json",
		Accept: "application/json",
		Authorization: auth,
	};
	if (options?.idempotencyKey) {
		headers["Idempotency-Key"] = options.idempotencyKey;
	}

	const res = await fetch(url, {
		method: "POST",
		headers,
		body: bodyStr,
	});

	const rawText = await res.text();
	let body: unknown = rawText;
	try {
		body = JSON.parse(rawText) as unknown;
	} catch {
		// keep raw
	}

	return { ok: res.ok, status: res.status, body, rawText };
}
