# Threat model (v1)

## Assets

- **Signing secret**: protects the ingest endpoint from unauthenticated draft creation.
- **EmDash content**: draft posts in the `posts` collection until a human publishes in admin.

## Trust boundaries

| Zone | Trust |
|------|--------|
| EmDash admin | Trusted operators configure secrets and rate limits. |
| MCP + agent host | Holds `EMDASH_HMAC_SECRET`; must not be committed to git. |
| Internet | Untrusted; anyone can call public ingest URL. |

## Controls

1. **HMAC** over timestamp, nonce, method, path, and canonical body hash.
2. **Replay**: nonce stored per plugin KV; timestamp skew window (default 300s).
3. **Rate limits**: per signing key id and per client IP (KV fixed windows).
4. **Payload limits**: max request size, frontmatter/body caps, Markdown→PT time budget.
5. **Idempotency**: optional `Idempotency-Key` header (24h) for safe retries.

## Out of scope (v1)

- Publishing automation.
- Media upload via ingest.
- End-user authentication at the ingest edge (HMAC is machine-to-machine).

## Residual risks

- KV entries for nonces/idempotency grow over time; operators should monitor storage and rotate secrets if leaked.
- WAF / edge rate limits (e.g. Cloudflare) are recommended for production; see operator runbook.
