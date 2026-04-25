import { markdownToPortableText } from "@portabletext/markdown";
import { DEFAULT_CONVERSION_MS } from "./constants.js";

export type MarkdownToPtResult = {
	blocks: unknown[];
	ms: number;
};

/**
 * Convert markdown string to Portable Text blocks with a wall-clock budget.
 */
export function markdownToPortableTextBlocks(markdown: string, budgetMs = DEFAULT_CONVERSION_MS): MarkdownToPtResult {
	const start = performance.now();
	const blocks = markdownToPortableText(markdown) as unknown[];
	const ms = performance.now() - start;
	if (ms > budgetMs) {
		throw new Error("Markdown conversion exceeded time budget");
	}
	return { blocks, ms };
}
