# Goose MCP setup

Goose can run the same stdio MCP server as Cursor. Configure a server that launches `npx` with the EmPost package and the same environment variables.

## Example (YAML)

See [examples/mcp.goose.yaml](../examples/mcp.goose.yaml) for a concrete block you can merge into your Goose configuration.

## Environment

| Variable | Purpose |
|----------|---------|
| `EMDASH_INGEST_URL` | Full HTTPS URL to `.../empost-md-draft/ingest` |
| `EMDASH_HMAC_SECRET` | Plugin admin signing secret |
| `EMDASH_KEY_ID` | Optional; default `default` |

## Tools available

- `validate_markdown`
- `ingest_markdown`
- `ingest_path`

Use **`validate_markdown`** in a dry-run flow before calling ingest.

## Troubleshooting

- **401 / signature**: Path in `EMDASH_INGEST_URL` must match the server’s pathname exactly (including `/empost-md-draft/ingest`).
- **403**: Plugin rate limits — raise thresholds in admin or slow down requests.
