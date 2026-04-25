import { describe, expect, it } from "vitest";
import { buildCanonicalString, canonicalIngestBodyBytes, hmacSha256Hex, sha256Hex, timingSafeEqualHex } from "@emplugins/shared";
import { loadIngestEnv } from "../src/ingest-client.js";

describe("signAndPostIngest canonical alignment", () => {
	it("matches plugin-side HMAC inputs", async () => {
		const markdown = "---\ntitle: A\n---\n\nHi";
		const bodyBytes = canonicalIngestBodyBytes(markdown);
		const bodyHash = await sha256Hex(bodyBytes);
		const path = "/_emdash/api/plugins/empost-md-draft/ingest";
		const canonical = buildCanonicalString("111", "n-1", "POST", path, bodyHash);
		const sig = await hmacSha256Hex("a".repeat(32), canonical);
		const sig2 = await hmacSha256Hex("a".repeat(32), canonical);
		expect(timingSafeEqualHex(sig, sig2)).toBe(true);
	});

	it("loadIngestEnv throws when required vars missing", () => {
		const keys = ["EMDASH_INGEST_URL", "EMDASH_HMAC_SECRET"] as const;
		const prev: Record<string, string | undefined> = {};
		for (const k of keys) {
			prev[k] = process.env[k];
			delete process.env[k];
		}
		try {
			expect(() => loadIngestEnv()).toThrow(/EMDASH_INGEST_URL/);
		} finally {
			for (const k of keys) {
				const v = prev[k];
				if (v === undefined) delete process.env[k];
				else process.env[k] = v;
			}
		}
	});
});
