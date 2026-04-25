# Changesets

Publishable packages in this monorepo:

- `@emplugins/emdash-plugin-md-draft`
- `@emplugins/mcp-emdash-drafts`

`@emplugins/shared` is **private** and versioned only for workspace builds.

## Release flow

1. `pnpm changeset` — describe changes and bump type per package.
2. Merge the changeset + version PR.
3. `pnpm changeset version` then `pnpm build` / `pnpm test`.
4. `pnpm publish -r --access public` from a clean checkout with npm auth for the `@emplugins` scope.

Update [docs/release-checklist.md](../docs/release-checklist.md) before tagging.
