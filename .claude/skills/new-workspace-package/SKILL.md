---
name: new-workspace-package
description: Scaffold a new Bun workspace package under packages/ in console-next (e.g. a second backend service, a shared library). Use when adding a new packages/<name> directory, not for changes inside an existing package.
---

Mirrors exactly how `packages/api` was created (`docs/adr/0008-hono-rest-openapi-backend.md`). The frontend stays the root package — it does **not** get moved into a matching `packages/console` for symmetry; don't do that as part of this either, it's a separate, deliberately-rejected decision.

## Steps

1. `mkdir -p packages/<name>/src`
2. Write `packages/<name>/package.json`: `"name": "@console-next/<name>"`, `"private": true`, `"version": "0.0.0"`, `"type": "module"`, a `dev` script, and only the dependencies this package actually needs (don't inherit the root's). Pin exactly (no `^`) for the same reasons as the root's policy — see `CONTRIBUTING.md`'s Dependency pinning policy — check each new dependency against that policy as you add it, not after.
3. Write `packages/<name>/tsconfig.json`, matching the strictest settings used elsewhere (`tsconfig.app.json`/`packages/api/tsconfig.json` as references). Leave `exactOptionalPropertyTypes` **on** by default — only turn it off if a real typecheck failure shows a third-party library's own types don't satisfy it (this happened for `infra/` against `aws-cdk-lib`, did not happen for `packages/api` against Hono — check, don't assume either way).
4. Add `{ "path": "./packages/<name>/tsconfig.json" }` to the root `tsconfig.json`'s `references` array. **Do this in the same change that creates the package** — otherwise `tsc -b --noEmit` silently skips the new package, the same decorative-declaration mistake the removed `.nvmrc`/`engines.node` pin was.
5. From the repo root: `bun install` (links the workspace; confirms one `bun.lock` covers everything — Bun doesn't hoist workspace deps to the root `node_modules`, each package gets its own with symlinks into `node_modules/.bun`, see README's Known quirks).
6. `bun audit --audit-level=high` immediately after adding any new dependency — not at the end of the session.
7. Write the actual first file, then `bun run typecheck` and `bun run lint` — fix whatever Biome/tsc flag before adding more.
8. **Don't scaffold a test setup for zero tests.** `packages/api` deliberately shipped without one (see ADR 0008) — add a `node`-environment Vitest config only once there's real behavior worth testing, not preemptively.
9. If this package should get its own versioned `CHANGELOG.md`, add an entry to both `release-please-config.json` and `.release-please-manifest.json` (`"packages/<name>": { "release-type": "node", "package-name": "@console-next/<name>", "changelog-path": "CHANGELOG.md" }` and `"packages/<name>": "0.0.0"` respectively).
10. Update `README.md`'s Directory structure and Stack sections to mention the new package, and add a `docs/adr/` entry (`/new-adr`) if creating it was itself a real, non-obvious decision — not every new package needs one; adding the second one usually isn't surprising anymore, adding a third with a different shape (e.g. a shared types package) might be.
11. Run the full pipeline (`lint`, `typecheck`, `test`, `build`, `bun audit`) before considering this done, same as any other change.
