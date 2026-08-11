# `apps/*` + `packages/*` workspace restructure, superseding ADR 0008's rejection

## Status

Accepted — executed in full: `apps/web` (was the root package) and `apps/api` (was `packages/api`) are both real, moved workspace packages; every config/doc/skill cross-reference found while tracing the dependency graph was updated in the same change.

## Context

A separate design exercise (`PROJECT.md`, an exploratory brainstorm, not itself binding) assumed an `apps/web` + `apps/api` + `apps/ingestion` + `packages/shared` layout for a planned football-analytics build-out (see ADR 0010). The actual repo had the frontend as the workspace **root** and `packages/api` as the only backend member — ADR 0008 deliberately chose this over a symmetric restructure (`packages/console` + `packages/api`), reasoning the blast radius (the Vite alias, three tsconfigs, `biome.json`, `vitest` include, `cdk.json`'s reference, README/ADR cross-refs) wasn't worth it for one backend package with one spike route.

Two things changed since ADR 0008:

1. **The convention itself is real, not `PROJECT.md`'s invention.** Checked against Turborepo's own docs (not assumed): "Turborepo recommends splitting packages into `apps/` for applications and services and `packages/` for everything else, like libraries and tooling" — `apps/` holds launchable apps/services, `packages/` holds shared internal libraries. Widely followed beyond Turborepo specifically. (Also explicitly framed there as "not a requirement — just a suggested directory structure"; nothing about Bun workspaces themselves mandates it either way.)
2. **The plan now calls for `apps/ingestion` and `packages/shared` on top of the existing `packages/api`** (see `TODO.md`). Under the old layout that would mean two of three `packages/*` entries are actually deployable services, not shared libraries — stretching "packages" to mean "workspace member" rather than what the convention above says it should mean.

This is also the cheapest point this migration will ever be: `packages/api` was still a one-route spike, and `ingestion`/`shared` didn't exist yet. Every day this was deferred, more real backend code would have had to move later instead of now.

## Decision

Move the frontend from the workspace root into `apps/web`, and `packages/api` into `apps/api`. `packages/*` is now reserved for genuine shared internal libraries (e.g. the future `packages/shared`); `apps/*` for anything independently deployable.

**Mechanics, since this touches the dependency graph, not just directory names:**

- `apps/web` gets its **own `package.json`** — every frontend-only dependency (React, Mantine, Vite, Vitest, TanStack frontend libraries, Testing Library, `jsdom`, `postcss`, `vite-plugin-bundlesize`) moved off the root manifest into it. The root `package.json` is now workspace-root-only: the `workspaces` glob (`["apps/*", "packages/*"]`), shared tooling (`@biomejs/biome`, `prettier`, `lefthook`, `commitlint`, `typescript`, `@types/node`), and `infra/`'s CDK dependencies (`aws-cdk`, `aws-cdk-lib`, `constructs`) — `infra/` still isn't a workspace member, and still resolves its dependencies by walking up to whatever `package.json` sits at the repo root, exactly as ADR 0007/0008 already established.
- `apps/web` also gets its **own `tsconfig.json`** (the `"@/*"` path alias plus references to `tsconfig.app.json`/`tsconfig.node.json`) — what the root `tsconfig.json` used to double as. The root `tsconfig.json` is now a pure project-reference aggregator: `apps/web`, `apps/api`, `packages/e2e`, `infra`.
- Root scripts that used to _be_ the frontend's scripts (`dev`, `codegen`, `build`, `preview`, `test`, `test:watch`, `test:coverage`) are now one-line delegations via Bun's `bun run --filter <path> <script>` — confirmed real and current against [Bun's own workspaces docs](https://bun.com/docs/pm/workspaces), not assumed. `lint` and `typecheck` needed no such change: Biome's `includes` glob and `tsc -b`'s project references already operate tree-wide regardless of workspace boundaries, so they were never "the frontend's scripts" to begin with.
- Traced every config that hardcodes a path rather than glossing over the directory move alone, and fixed what actually breaks:
  - `.gitignore`'s `src/routeTree.gen.ts` entry is path-anchored (contains a `/`) — updated to `apps/web/src/routeTree.gen.ts`, otherwise the generated file would show up as untracked.
  - `.vscode/settings.json`'s `cssVariables.lookupFiles` pointed at `node_modules/@mantine/core/styles.css` — since Bun workspaces don't hoist (already documented in this README re: `hono`), once Mantine is an `apps/web`-only dependency that path stops existing at the repo root entirely. Updated to `apps/web/node_modules/@mantine/core/styles.css`.
  - `release-please-config.json`/`.release-please-manifest.json`: renamed the `packages/api` entry to `apps/api`, and **added a new `apps/web` entry** — without it, frontend commits would silently stop getting changelog coverage (today they're covered under `.` only because root _is_ the frontend; after the move `.` no longer touches frontend code). Confirmed no `CHANGELOG.md` exists anywhere yet, so the rename carries no release history to lose.
  - `.claude/CLAUDE.md`, `README.md`, `CONTRIBUTING.md`, `.claude/skills/new-workspace-package/SKILL.md`, and both `run-console`/`run-api` skills — path references updated. `run-console` also moved from repo-root `.claude/skills/` to `apps/web/.claude/skills/`, to match `run-api`'s existing colocation pattern now that the frontend is a real workspace package, not the root.
  - `.github/workflows/ci.yml`, `cdk.json`, `lefthook.yml`, `biome.json` needed **no changes** — none of them hardcode `src/` or `packages/api`; they either glob tree-wide or point at `infra/` directly.

## What was actually built

Full migration, in one change: `git mv` of `src/`, `index.html`, `public/`, `vite.config.ts`, `tsconfig.app.json`, `tsconfig.node.json`, `postcss.config.cjs` into `apps/web/`; `git mv packages/api apps/api`; new `apps/web/package.json` and `apps/web/tsconfig.json`; root `package.json`/`tsconfig.json` rewritten; every config/doc/skill listed above updated. Verified via the full pipeline: `bun install`, `bun run lint`, `bun run typecheck`, `bun run test`, `bun run build`, `packages/e2e`'s Playwright suite, `bunx cdk synth`, `bun audit --audit-level=high`.

## Consequences / known gaps, deliberately not resolved here

- Build output now lands at `apps/web/dist/`, not repo-root `dist/` — noted in README, relevant once the S3 sync step in `TODO.md` gets written.
- `TODO.md`'s football-analytics item referencing `packages/ingestion` is corrected to `apps/ingestion` — it's a planned deployable (a scheduled job), not a shared library.
- ADR 0008's "one repo, `packages/api` as a Bun workspace — the frontend does _not_ move" section is superseded by this ADR — addended there rather than rewritten, so the original reasoning (and why it made sense at the time) stays on record.

## Considered and rejected

- **Deferring this to "build time"**, as `PROJECT.md` §10 suggested for the ingestion-deploy-shape question — rejected specifically for this decision: unlike that question (genuinely ambiguous until real runtime needs are known), this one only gets more expensive with time, since every route added to `apps/api` (née `packages/api`) between now and "build time" is more code that would need moving later instead of now.
- **Leaving the frontend at root and only adding `apps/ingestion` alongside it** — rejected: this doesn't fix the underlying issue (deployables and shared libraries mixed under `packages/`), and would leave `apps/` holding only `ingestion` while the frontend and API sit in two different, inconsistent places (root and `packages/`).
