import { jsonIngestBodySchema } from "./schemas.js";

const encoder = new TextEncoder();

export type ParsedAuthHeader = {
	keyId: string;
	ts: string;
	nonce: string;
	signatureHex: string;
};

export function parseAuthorizationHeader(value: string | null): ParsedAuthHeader | null {
	if (!value?.startsWith("HMAC-SHA256 ")) return null;
	const parts = value.slice("HMAC-SHA256 ".length).split(/\s*,\s*/);
	const map = new Map<string, string>();
	for (const p of parts) {
		const eq = p.indexOf("=");
		if (eq === -1) continue;
		const k = p.slice(0, eq).trim();
		const v = p.slice(eq + 1).trim();
		map.set(k, v);
	}
	const keyId = map.get("keyId");
	const ts = map.get("ts");
	const nonce = map.get("nonce");
	const signature = map.get("signature");
	if (!keyId || !ts || !nonce || !signature) return null;

	// Basic input hardening: constrain sizes and formats to avoid KV key abuse and pathological parsing.
	if (keyId.length < 1 || keyId.length > 64) return null;
	if (!/^[a-zA-Z0-9._-]+$/.test(keyId)) return null;
	if (ts.length < 1 || ts.length > 16) return null;
	if (!/^[0-9]+$/.test(ts)) return null;
	if (nonce.length < 8 || nonce.length > 128) return null;
	if (!/^[a-zA-Z0-9._-]+$/.test(nonce)) return null;
	if (signature.length !== 64) return null;
	if (!/^[0-9a-fA-F]{64}$/.test(signature)) return null;

	return { keyId, ts, nonce, signatureHex: signature };
}

export async function sha256Hex(bytes: Uint8Array): Promise<string> {
	const copy = new Uint8Array(bytes.byteLength);
	copy.set(bytes);
	const digest = await crypto.subtle.digest("SHA-256", copy);
	return bufferToHex(new Uint8Array(digest));
}

function bufferToHex(buf: Uint8Array): string {
	return [...buf].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function hexToBuffer(hex: string): Uint8Array | null {
	if (hex.length % 2 !== 0) return null;
	const out = new Uint8Array(hex.length / 2);
	for (let i = 0; i < hex.length; i += 2) {
		const byte = Number.parseInt(hex.slice(i, i + 2), 16);
		if (Number.isNaN(byte)) return null;
		out[i / 2] = byte;
	}
	return out;
}

/**
 * Canonical UTF-8 bytes for the JSON body used in HMAC (must match client).
 */
export function canonicalIngestBodyBytes(markdown: string): Uint8Array {
	const body = jsonIngestBodySchema.parse({ markdown });
	return encoder.encode(JSON.stringify({ markdown: body.markdown }));
}

export function buildCanonicalString(
	ts: string,
	nonce: string,
	method: string,
	pathname: string,
	bodySha256Hex: string,
): string {
	return `${ts}\n${nonce}\n${method.toUpperCase()}\n${pathname}\n${bodySha256Hex}`;
}

export async function hmacSha256Hex(secret: string, message: string): Promise<string> {
	const key = await crypto.subtle.importKey(
		"raw",
		encoder.encode(secret),
		{ name: "HMAC", hash: "SHA-256" },
		false,
		["sign"],
	);
	const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(message));
	return bufferToHex(new Uint8Array(sig));
}

export function timingSafeEqualHex(a: string, b: string): boolean {
	const ab = hexToBuffer(a.toLowerCase());
	const bb = hexToBuffer(b.toLowerCase());
	if (!ab || !bb || ab.length !== bb.length) return false;
	let diff = 0;
	for (let i = 0; i < ab.length; i++) diff |= ab[i]! ^ bb[i]!;
	return diff === 0;
}
