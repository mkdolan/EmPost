import matter from "gray-matter";
import { frontmatterSchema, type Frontmatter } from "./schemas.js";
import {
	DEFAULT_MAX_BODY_BYTES,
	DEFAULT_MAX_FRONTMATTER_BYTES,
	DEFAULT_MAX_REQUEST_BYTES,
} from "./constants.js";

export type ParsedMarkdownFile = {
	frontmatter: Frontmatter;
	body: string;
	raw: string;
};

function enforceSizeCaps(raw: string): void {
	const enc = new TextEncoder().encode(raw);
	if (enc.byteLength > DEFAULT_MAX_REQUEST_BYTES) {
		throw new Error("Markdown file exceeds max size");
	}
	const fmEnd = raw.indexOf("\n---", 4);
	if (raw.startsWith("---") && fmEnd !== -1) {
		const fmRegion = raw.slice(0, fmEnd + 4);
		if (new TextEncoder().encode(fmRegion).byteLength > DEFAULT_MAX_FRONTMATTER_BYTES) {
			throw new Error("Frontmatter exceeds max size");
		}
		const body = raw.slice(fmEnd + 4).replace(/^\r?\n/, "");
		if (new TextEncoder().encode(body).byteLength > DEFAULT_MAX_BODY_BYTES) {
			throw new Error("Markdown body exceeds max size");
		}
	} else {
		if (new TextEncoder().encode(raw).byteLength > DEFAULT_MAX_BODY_BYTES) {
			throw new Error("Markdown body exceeds max size");
		}
	}
}

/**
 * Parse a full markdown document with optional YAML frontmatter.
 */
export function parseMarkdownDocument(raw: string): ParsedMarkdownFile {
	enforceSizeCaps(raw);
	const parsed = matter(raw);
	const fm = frontmatterSchema.safeParse(parsed.data);
	if (!fm.success) {
		const msg = fm.error.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join("; ");
		throw new Error(`Invalid frontmatter: ${msg}`);
	}
	return {
		frontmatter: fm.data,
		body: parsed.content.trimStart(),
		raw,
	};
}
