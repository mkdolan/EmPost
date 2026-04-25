import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { readFile } from "node:fs/promises";
import { stat } from "node:fs/promises";
import { extname } from "node:path";
import { parseMarkdownDocument } from "@empost/shared";
import { loadIngestEnv, signAndPostIngest } from "./ingest-client.js";

function toolText(obj: unknown): { content: Array<{ type: "text"; text: string }> } {
	return {
		content: [{ type: "text", text: typeof obj === "string" ? obj : JSON.stringify(obj, null, 2) }],
	};
}

function getEnvLazy() {
	try {
		return loadIngestEnv();
	} catch (e) {
		return e instanceof Error ? e : new Error(String(e));
	}
}

const server = new McpServer({
	name: "empost-emdash-drafts",
	version: "0.1.0",
});

server.registerTool(
	"ingest_markdown",
	{
		description:
			"Create a draft post in EmDash from a full Markdown document (optional YAML frontmatter). Requires EMDASH_INGEST_URL, EMDASH_HMAC_SECRET, EMDASH_KEY_ID.",
		inputSchema: {
			markdown: z.string().min(1).describe("Full markdown including optional --- frontmatter"),
			idempotencyKey: z.string().optional().describe("Optional Idempotency-Key header for safe retries"),
		},
	},
	async ({ markdown, idempotencyKey }) => {
		const envOrErr = getEnvLazy();
		if (envOrErr instanceof Error) {
			return toolText({ error: envOrErr.message });
		}
		const result = await signAndPostIngest(envOrErr, markdown, { idempotencyKey });
		return toolText({
			ok: result.ok,
			status: result.status,
			response: result.body,
		});
	},
);

server.registerTool(
	"ingest_path",
	{
		description: "Read a Markdown file from disk and ingest it as a draft (same as ingest_markdown).",
		inputSchema: {
			path: z.string().min(1).describe("Absolute or relative path to a .md file"),
			idempotencyKey: z.string().optional(),
		},
	},
	async ({ path, idempotencyKey }) => {
		const envOrErr = getEnvLazy();
		if (envOrErr instanceof Error) {
			return toolText({ error: envOrErr.message });
		}
		let markdown: string;
		try {
			if (extname(path).toLowerCase() !== ".md") {
				return toolText({ error: "Only .md files are allowed" });
			}
			const st = await stat(path);
			if (!st.isFile()) {
				return toolText({ error: "Path must be a file" });
			}
			// Avoid accidentally slurping huge files via agent prompts.
			if (st.size > 2 * 1024 * 1024) {
				return toolText({ error: "File too large (max 2MB)" });
			}
			markdown = await readFile(path, "utf8");
		} catch (e) {
			return toolText({ error: e instanceof Error ? e.message : "Failed to read file" });
		}
		const result = await signAndPostIngest(envOrErr, markdown, { idempotencyKey });
		return toolText({
			ok: result.ok,
			status: result.status,
			path,
			response: result.body,
		});
	},
);

server.registerTool(
	"validate_markdown",
	{
		description: "Validate frontmatter and markdown locally without writing to EmDash.",
		inputSchema: {
			markdown: z.string().min(1),
		},
	},
	async ({ markdown }) => {
		try {
			const doc = parseMarkdownDocument(markdown);
			return toolText({
				valid: true,
				title: doc.frontmatter.title,
				collection: doc.frontmatter.collection,
				bodyPreview: doc.body.slice(0, 200),
			});
		} catch (e) {
			return toolText({
				valid: false,
				error: e instanceof Error ? e.message : String(e),
			});
		}
	},
);

const transport = new StdioServerTransport();
await server.connect(transport);
