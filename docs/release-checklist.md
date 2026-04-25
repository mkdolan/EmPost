# Release checklist

- [ ] `pnpm build` and `pnpm test` pass locally and in CI.
- [ ] `pnpm pack:check` shows only intended files in tarballs.
- [ ] Version bumps via Changesets (or manual semver) for publishable packages.
- [ ] README compatibility note: **EmDash 0.7.x**; ingest body is JSON `{ "markdown" }` (see operator runbook).
- [ ] `@emplugins/emdash-plugin-md-draft` peer range for `emdash` still correct.
- [ ] Smoke: install plugin in a minimal EmDash app; run MCP via `npx` against staging.
- [ ] Update compatibility notes in package READMEs if EmDash API changed.
- [ ] Tag release and publish to npm (scoped `@emplugins/*`).
