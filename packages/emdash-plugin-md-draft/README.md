# `@emplugins/emdash-plugin-md-draft`

EmDash **native** plugin that exposes authenticated HTTP routes to create **`posts` drafts** from Markdown (via the `@emplugins/mcp-emdash-drafts` MCP server or any HMAC-aware client).

## Install

```bash
pnpm add @emplugins/emdash-plugin-md-draft
```

Peer: **`emdash` `^0.7.0`**.

## Register (Astro)

```ts
import { defineConfig } from "astro/config";
import { emdash } from "emdash/astro";
import { empostMdDraftPlugin } from "@emplugins/emdash-plugin-md-draft";

export default defineConfig({
	integrations: [
		emdash({
			plugins: [empostMdDraftPlugin()],
		}),
	],
});
```

This package uses **`format: "native"`** so it can ship an admin **settings schema** (HMAC secret, quotas, payload limits). Native plugins must be listed under `plugins: []` (not `sandboxed: []`).

## HTTP routes

| Route key | Method | Purpose |
|-----------|--------|---------|
| `health` | GET | Liveness (`public`) |
| `ingest` | POST | Create draft (`public`, HMAC-gated) |

Typical URLs (no trailing slash required on your site base):

- `GET /_emdash/api/plugins/empost-md-draft/health`
- `POST /_emdash/api/plugins/empost-md-draft/ingest`

## Ingest contract

EmDash’s plugin host parses the request as **JSON** before your handler runs. The body must be:

```json
{ "markdown": "---\ntitle: \"Hello\"\n---\n\n# Body\n" }
```

The MCP server uses the same canonical JSON bytes for **HMAC** signing as the plugin verifies.

## Next steps

- [Operator runbook](../../docs/operator-runbook.md)
- [Cursor MCP](../../docs/cursor-mcp.md) · [Goose MCP](../../docs/goose-mcp.md)
