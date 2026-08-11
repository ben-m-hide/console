# Contributing

This is a private, solo learning project (see [`LICENSE`](./LICENSE)) — this document is dev-workflow notes for future-me (or anyone invited to collaborate directly), not an open-contribution guide.

## Setup

```sh
bun install    # installs the whole workspace (root + packages/api)
bun run dev    # frontend dev server
```

See the [README](./README.md#commands) for the full command list, and [`docs/adr/`](./docs/adr/README.md) for why things are built the way they are — read the relevant ADR before changing a decision it documents, not after.

## Before committing

Pre-commit/commit-msg hooks (lefthook) run automatically, but the same checks can be run directly:

```sh
bun run lint            # biome check — whole workspace
bun run format:md:check # prettier --check, markdown only
bun run typecheck        # tsc -b --noEmit — whole workspace
bun run test             # vitest run — frontend only
```

Commit messages must be [Conventional Commits](https://www.conventionalcommits.org/) (enforced by commitlint) — `release-please` reads these directly to generate each package's `CHANGELOG.md` and version bump, so an inaccurate type (`fix:` for something that was actually a `feat:`, etc.) shows up wrong in a real changelog, not just a lint warning.

## Adding a decision worth recording

Only write an ADR (`docs/adr/NNNN-slug.md`) when a decision is hard to reverse, would be surprising without context, and involved a genuine trade-off between real alternatives — see `docs/adr/README.md`. Most day-to-day changes don't need one.

## Adding a new workspace package

Bun workspaces (`"workspaces": ["packages/*"]` in the root `package.json`) — the frontend is deliberately **not** one of them, it's the root package (see `docs/adr/0008-hono-rest-openapi-backend.md` for why). A new package needs:

- Its own `package.json` and `tsconfig.json`.
- A project reference added to the root `tsconfig.json`'s `references` array — otherwise `tsc -b --noEmit` silently skips it. (This bit us before, in a different form: the removed `.nvmrc`/`engines.node` pin was decorative for the same underlying reason — a declaration nothing actually checks.)
- An entry in `release-please-config.json` / `.release-please-manifest.json` if it should get its own versioned changelog.
- `exactOptionalPropertyTypes`: try leaving it on first (it's on by default in every `tsconfig.app.json`-style config here) and only scope it off if a third-party library's own types don't satisfy it — checked, not assumed, for both `infra/` (had to turn it off, `aws-cdk-lib`'s types) and `packages/api` (didn't, Hono's types are clean).

## Dependency pinning policy

Most dependencies float (`^`). Pin exactly (no `^`) when a package is either large/new-dependency-surface with no `bun audit` allowlist safety net (e.g. `aws-cdk-lib`, `hono`), or ships rules that can change behavior on a routine bump without a semver-major (Biome's `nursery`-tier lint rules). When in doubt, check what `bun audit --audit-level=high` and `bun run lint` do right after adding something new, not weeks later.

**This applies to GitHub Actions too, not just `bun` packages** — a mutable tag (`@v5`) is an action maintainer moving a pointer, not a version; anyone who compromises the action's repo can move it. Every `uses:` in `.github/workflows/` is pinned to a full commit SHA with the resolved version as a trailing comment (`uses: owner/repo@<sha> # vX.Y.Z`), and Dependabot's `github-actions` ecosystem entry bumps both together. This was missed initially — CI itself was a lower-pinning-rigor exception to a policy it otherwise enforces on the app's own dependencies, caught by adversarial review rather than by writing the policy in the first place.
