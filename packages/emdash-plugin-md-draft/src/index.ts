import type { PluginDescriptor } from "emdash";

const PKG_VERSION = "0.1.0";

/**
 * EmPost Markdown draft ingest plugin — add to `emdash({ plugins: [...] })`.
 *
 * Shipped as a **native** plugin (`format: "native"`) so admin `settingsSchema` is available.
 * Configure the HMAC secret in `/_emdash/admin`, then point MCP clients at
 * `POST {site}/_emdash/api/plugins/empost-md-draft/ingest`.
 */
export function empostMdDraftPlugin(): PluginDescriptor {
	return {
		id: "empost-md-draft",
		version: PKG_VERSION,
		entrypoint: "@emplugins/emdash-plugin-md-draft/plugin",
		format: "native",
	};
}
