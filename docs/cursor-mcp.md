# Cursor MCP setup

## 1. Install the server (optional local pin)

Use `npx` so you do not need a global install:

```bash
npx -y @emplugins/mcp-emdash-drafts
```

## 2. Project MCP config

Add a **stdio** server entry (Cursor **Settings → MCP** or project `.cursor/mcp.json`). Example:

```json
{
  "mcpServers": {
    "emdash-drafts": {
      "command": "npx",
      "args": ["-y", "@emplugins/mcp-emdash-drafts"],
      "env": {
        "EMDASH_INGEST_URL": "https://YOUR_SITE/_emdash/api/plugins/empost-md-draft/ingest",
        "EMDASH_HMAC_SECRET": "YOUR_SECRET",
        "EMDASH_KEY_ID": "default"
      }
    }
  }
}
```

Copy from [examples/mcp.cursor.json](../examples/mcp.cursor.json) and replace placeholders.

## 3. Workflow

1. Author a post as Markdown (see [examples/post-template.md](../examples/post-template.md)).
2. Ask the agent to run **`ingest_path`** or **`ingest_markdown`**.
3. Open the returned **`adminUrl`** (or your `/_emdash/admin` URL) to review the draft.

## Troubleshooting

- **401**: Verify `EMDASH_INGEST_URL` path matches the deployed plugin id (`empost-md-draft`) and route (`ingest`). Regenerate `ts` / `nonce` on each request (the MCP server does this automatically).
- **Clock skew**: Ensure the machine running Cursor has accurate time (NTP).
