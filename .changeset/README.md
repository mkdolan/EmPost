# Changesets

Publishable packages in this monorepo:

- `@empost/emdash-plugin-md-draft`
- `@empost/mcp-emdash-drafts`

`@empost/shared` is **private** and versioned only for workspace builds.

## Release flow

1. `pnpm changeset` — describe changes and bump type per package.
2. Merge the changeset + version PR.
3. `pnpm changeset version` then `pnpm build` / `pnpm test`.
4. `pnpm publish -r` from a clean checkout with npm auth for the `@empost` scope (or your chosen scope after renaming packages).

Update [docs/release-checklist.md](../docs/release-checklist.md) before tagging.
