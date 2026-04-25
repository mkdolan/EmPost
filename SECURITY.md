# Security

## Reporting

Please report vulnerabilities by opening a **private** security advisory on this repository (or contact the maintainers if that is not available).

## HMAC signing

Draft ingest requires a valid **HMAC-SHA256** `Authorization` header. Store the signing secret only in EmDash plugin admin settings and in local MCP env (`EMDASH_HMAC_SECRET`), never in client-side code or public repos.

## Threat model

See [docs/threat-model.md](./docs/threat-model.md).

## Disclosure

We aim to acknowledge reports within a few business days and coordinate a fix and release timeline before public disclosure.
