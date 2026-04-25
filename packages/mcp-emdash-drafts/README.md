# `@emplugins/mcp-emdash-drafts`

Stdio **MCP server** for [Model Context Protocol](https://modelcontextprotocol.io) clients (**Cursor**, **Goose**, etc.): validate Markdown locally, then **sign and POST** drafts to an EmDash site running [`@emplugins/emdash-plugin-md-draft`](../emdash-plugin-md-draft).

## Tools

| Tool | Description |
|------|-------------|
| `validate_markdown` | Parse frontmatter + body locally (no network write). |
| `ingest_markdown` | POST a full markdown string to the ingest URL. |
| `ingest_path` | Read a file from disk, then same as `ingest_markdown`. |

## Environment

| Variable | Required | Description |
|----------|----------|-------------|
| `EMDASH_INGEST_URL` | Yes | Full URL to ingest, e.g. `https://example.com/_emdash/api/plugins/empost-md-draft/ingest` |
| `EMDASH_HMAC_SECRET` | Yes | Same secret configured in EmDash plugin admin |
| `EMDASH_KEY_ID` | No | Defaults to `default`; must match plugin **Expected key id** |

## Run (CLI / `npx`)

```bash
npx -y @emplugins/mcp-emdash-drafts
```

The process speaks MCP on stdio — configure your client to launch this command with the env vars above.

## Client snippets

See [examples/mcp.cursor.json](../../examples/mcp.cursor.json) and [examples/mcp.goose.yaml](../../examples/mcp.goose.yaml).
