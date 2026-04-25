import { describe, expect, it } from "vitest";
import {
	buildCanonicalString,
	canonicalIngestBodyBytes,
	hmacSha256Hex,
	parseMarkdownDocument,
	slugFromTitle,
	timingSafeEqualHex,
	sha256Hex,
} from "../src/index.js";

describe("slugFromTitle", () => {
	it("slugifies titles", () => {
		expect(slugFromTitle("Hello World!")).toBe("hello-world");
	});
});

describe("parseMarkdownDocument", () => {
	it("parses frontmatter and body", () => {
		const doc = parseMarkdownDocument(`---
title: "My Post"
---

# Hi

- a
`);
		expect(doc.frontmatter.title).toBe("My Post");
		expect(doc.body).toContain("# Hi");
	});

	it("rejects invalid status", () => {
		expect(() =>
			parseMarkdownDocument(`---
title: T
status: published
---
x`),
		).toThrow(/draft/);
	});
});

describe("HMAC", () => {
	it("canonical body and signature round-trip", async () => {
		const md = "# Title\n\nbody";
		const bytes = canonicalIngestBodyBytes(md);
		const bodyHash = await sha256Hex(bytes);
		const path = "/_emdash/api/plugins/empost-md-draft/ingest";
		const canonical = buildCanonicalString("1700000000", "n1", "POST", path, bodyHash);
		const secret = "test-secret";
		const sig = await hmacSha256Hex(secret, canonical);
		const sig2 = await hmacSha256Hex(secret, canonical);
		expect(timingSafeEqualHex(sig, sig2)).toBe(true);
		const sigBad = await hmacSha256Hex(secret + "x", canonical);
		expect(timingSafeEqualHex(sig, sigBad)).toBe(false);
	});
});
