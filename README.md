# EmPost

Markdown-first **draft ingestion** for [EmDash](https://emdashcms.com): an npm-installable plugin plus an MCP server so **Cursor** and **Goose** can create `posts` drafts without publishing.

## Quick start

### I run an EmDash site

```bash
pnpm add @emplugins/emdash-plugin-md-draft
```

Register the plugin in `astro.config.mjs` (see [`packages/emdash-plugin-md-draft/README.md`](./packages/emdash-plugin-md-draft/README.md)), configure **HMAC signing secret** and limits in `/_emdash/admin`, then use the ingest URL from the operator runbook.

### I use Cursor or Goose

```bash
# Optional: pin version instead of -y
npx -y @emplugins/mcp-emdash-drafts
```

Add the MCP server to Cursor or Goose with env vars `EMDASH_INGEST_URL`, `EMDASH_HMAC_SECRET`, `EMDASH_KEY_ID` — see [`docs/cursor-mcp.md`](./docs/cursor-mcp.md) and [`docs/goose-mcp.md`](./docs/goose-mcp.md).

## Packages

| Package | Description |
|--------|-------------|
| `@emplugins/shared` | Frontmatter, Zod, HMAC helpers, Markdown → Portable Text (workspace-only) |
| `@emplugins/emdash-plugin-md-draft` | EmDash plugin: signed ingest + health |
| `@emplugins/mcp-emdash-drafts` | MCP stdio server: `ingest_path`, `ingest_markdown`, `validate_markdown` |

## Repo layout

- [`emPost.md`](./emPost.md) — full v1 specification
- [`docs/`](./docs/) — threat model, runbook, client setup
- [`examples/`](./examples/) — sample post + config snippets

## Compatibility

Tested against **EmDash `0.7.x`**. Ingest uses `POST` with `Content-Type: application/json` and `{ "markdown": "..." }` because EmDash’s plugin route host parses JSON before the handler runs (see [`docs/operator-runbook.md`](./docs/operator-runbook.md)).

## License

MIT
