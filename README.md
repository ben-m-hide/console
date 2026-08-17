# console-next

Standalone TypeScript + React app. It is its own small Bun workspace: `apps/web` is the frontend, `apps/api` the backend, and `apps/ingestion` a scheduled Sportmonks ingestion job (real for one entity, `competitions` — see PROJECT.md's phased task list), with `packages/shared` (Zod schemas) and `packages/db` (Drizzle schema/client, see `docs/adr/0012-packages-db-and-bun-sql-driver.md`) as shared internal libraries — see `docs/adr/0011-apps-and-packages-workspace-restructure.md` for the `apps/`-vs-`packages/` convention.

## Stack

Full rationale for the non-obvious choices is in [`docs/adr/`](./docs/adr/README.md).

- **Ships as:** a static SPA (no server runtime in production)
- **Toolchain:** Bun — sole runtime for dev/build/test/lint/CI, no Node binary involved anywhere in the pipeline. (`@types/node` is a devDependency purely for typing Node-API globals Bun implements, e.g. `import.meta.dirname` — it doesn't imply a Node runtime dependency.) An earlier `engines.node`/`.nvmrc` pin was removed: Bun doesn't enforce `engines` (confirmed — no version warning on install, and it's a tracked upstream gap, [oven-sh/bun#5846](https://github.com/oven-sh/bun/issues/5846)/[#14030](https://github.com/oven-sh/bun/issues/14030)), and nothing in the toolchain actually shells out to a Node binary for the pin to describe.

### Frontend (`apps/web`)

- **Language:** TypeScript 7, strictest config
- **Framework:** Vite + React, TanStack Router (file-based routes in `apps/web/src/routes/`)
- **Styling/components:** [Mantine](https://mantine.dev) (`@mantine/core` + `@mantine/hooks`), styled via CSS Modules through `postcss-preset-mantine` (see `apps/web/postcss.config.cjs`) — typed component props/theme object instead of Tailwind utility-class strings. Font is Geist Variable, wired through the theme in `apps/web/src/lib/theme.ts`. See `docs/adr/0006-mantine-over-tailwind-shadcn.md` for why this replaced Tailwind v4 + shadcn/ui + Base UI.
- **State/data:** Zustand (client state), TanStack Query (server state), TanStack Form + Zod (forms/validation)
- **Devtools:** unified `@tanstack/react-devtools` panel (`TanStackDevtools` in `__root.tsx`) hosting Query, Router, and Form devtools in one place, instead of separate floating widgets. `@tanstack/devtools-vite` adds console-log piping between browser/terminal.

### Backend (`apps/api`)

[Hono](https://hono.dev), chosen over Express/Fastify/NestJS (see `docs/adr/0008-hono-rest-openapi-backend.md` for the full comparison, including verified — not assumed — npm download/production-adoption numbers). API style is REST + OpenAPI, not tRPC, generated code-first from Zod schemas via `@hono/zod-openapi` — one schema drives runtime validation, the `/doc` OpenAPI document, and (eventually) a generated typed client, so there's one source of truth instead of a hand-written spec that can drift. `hono`, `@hono/zod-openapi`, and `@scalar/hono-api-reference` are pinned exactly, same reasoning as Biome/CDK below. `/reference` mounts a [Scalar](https://scalar.com) API reference UI over the `/doc` OpenAPI document — a human-browsable page instead of raw JSON, for the cost of one route. **Spike only right now**: `GET /health`, `/doc`, `/reference` — no real feature/domain chosen yet, no tests, no deploy runtime target picked (Lambda vs. Fargate/ECS — deliberately deferred, see Deferred below).

### Ingestion & data (`apps/ingestion`, `packages/db`, `packages/shared`)

- **`apps/ingestion`:** real Sportmonks vertical slices (2026-08-14) for `competitions` and `seasons` — fetch (`Authorization` header, real API), normalize (validated against `packages/shared`'s Zod schemas), upsert via `packages/db`'s `createDb()` (pooled connection string). `seasons` resolves its `competitionId` FK from Sportmonks' `league_id` against already-ingested competitions, so `index.ts` runs the two sequentially. Manual trigger only (`bun run src/index.ts`), no scheduling yet. Teams/players/squad_memberships/fixtures/match_events/ball_positions, rate limiting, and `ingestion_runs` audit logging are deliberately not built yet — see `TODO.md`.
- **`packages/db`:** Drizzle schema (all 10 tables, `PROJECT.md` §2) + `createDb(connectionString)`, `drizzle-orm/bun-sql` as the runtime driver (see `docs/adr/0012-packages-db-and-bun-sql-driver.md`). `drizzle-kit`'s own CLI (`db:generate`/`db:migrate`) separately needs a real Postgres driver package installed to connect — `postgres` (postgres.js) is a devDependency for exactly that, independent of the runtime driver choice.
- **`packages/shared`:** Zod schemas generated from `packages/db`'s Drizzle tables (`docs/adr/0013-generate-shared-schemas-from-drizzle.md`). Gained a `package.json` `exports` field (2026-08-14) once `apps/ingestion` became its first real consumer.

### Infrastructure (`infra/`)

AWS CDK (TypeScript) — private S3 bucket + CloudFront (Origin Access Control, not the legacy OAI) + a `ResponseHeadersPolicy` (CSP/HSTS/frame-options) + SPA fallback via CloudFront error responses. `bunx cdk synth` verified locally; **not deployed** — no AWS account confirmed, no `cdk bootstrap` run yet. See `docs/adr/0007-aws-s3-cloudfront-hosting.md` for the full reasoning, including why the CSP currently needs `style-src 'unsafe-inline'` (Mantine injects runtime `<style>` tags — verified, not assumed).

### Quality & testing

- **Lint/format:** Biome (lint + format + import ordering) for everything it covers — which, confirmed against Biome's own [language support matrix](https://biomejs.dev/internals/language-support/) and an empirical test (it silently ignored a `.md` file entirely), does **not** yet include Markdown (tracked upstream: [biomejs/biome#3718](https://github.com/biomejs/biome/issues/3718)). **Prettier**, scoped only to `.md` files (`.prettierrc.json`, `.prettierignore`, `bun run format:md`/`format:md:check`), fills that one gap — this doesn't reopen the single-formatter decision in `docs/adr/0004-biome-for-lint-and-format.md`, since Biome still owns every file type it actually supports.
- **Import grouping (`assist/source/organizeImports` in `biome.json`):** Node/Bun builtins → npm packages → `@/*` internal alias → relative paths → side-effect/bare imports (e.g. `./index.css`) last, each group blank-line-separated, applied automatically on save/`bun run lint:fix`.
- **Code style (enforced by Biome, `error`):** arrow functions over `function` (`lint/complexity/useArrowFunction`); explicit return types on all functions (`lint/nursery/useExplicitReturnType`); `Array<T>` over `T[]` (`lint/style/useConsistentArrayType`); naming casing + a two-character minimum (`lint/style/useNamingConvention`, `strictCase: false` so acronym-heavy third-party property names like `baseURL`/`enforceSSL` aren't flagged — a `biome.json` `overrides` entry turns it off entirely for `apps/ingestion/src/sportmonks-types.ts`, which deliberately mirrors Sportmonks' own snake_case field names); React hook rules — `useExhaustiveDependencies`/`useHookAtTopLevel` — are auto-enabled by Biome's "react" domain just from having `react` as a dependency, no config needed (verified empirically). Explicitly added on top: `noFloatingPromises`/`noMisusedPromises` (unhandled/misused promises — relevant given how async-heavy TanStack Query/Form are), `noNestedComponentDefinitions`, `noReactPropAssignments`, `useUniqueElementIds`, `noJsxPropsBind`. `@biomejs/biome` is pinned exactly (no `^`) rather than left floating, because several of the rules above are `nursery`-tier — Biome's explicit "may rename/restabilize/remove" bucket. A floating range meant a routine Dependabot bump could flip `bun run lint` red for reasons unrelated to whatever else was in that PR; pinning turns that into an expected part of the Biome-bump PR's own diff instead. Judgment-based conventions Biome can't enforce (explicit naming beyond casing, named returns, loops vs. array methods) live in [`docs/conventions/`](./docs/conventions/README.md), same "hard-to-reverse decisions get their own doc" spirit as `docs/adr/`.
- **Tests:** Vitest + React Testing Library (globals enabled — no need to import `describe`/`it`/`expect` per test file). `bun run test:coverage` runs `@vitest/coverage-v8` (was installed but unwired until now); `coverage.all` is left at its default `false`, so only code actually exercised by a test counts — most of `src/` (routes aside from `-index-page.tsx`, `lib/`) won't show up until something tests it, which is expected for a scaffold, not a bug. No thresholds enforced yet; add `coverage.thresholds` once there's enough real code for a number to mean something.
- **Accessibility:** `axe-core` run directly against rendered components in tests (see `-index-page.test.tsx`) — not the `vitest-axe` wrapper, which is unmaintained for Vitest 4's type system (its `declare global { namespace Vi }` augmentation doesn't merge with Vitest 4's `declare module 'vitest'` pattern). Tests assert `results.incomplete` is empty as well as `results.violations` — otherwise a check axe can't evaluate (e.g. `color-contrast`, see Known quirks) silently lands in `incomplete` and the test reports "no violations" while never actually running that check.
- **Bundle size budget:** `vite-plugin-bundlesize` fails the build if any JS chunk exceeds 150kB gzip (current: ~100kB main, ~9kB routes) — see the caveat below, it does not enforce CSS despite accepting a `**/*.css` glob. This matters more now than it did under Tailwind: Mantine ships full component CSS regardless of what's used, so the CSS bundle is currently ~34kB gzip (vs. ~5kB under Tailwind's purge-to-usage model) and nothing is watching it.

### CI & automation

- **Git hooks:** lefthook (pre-commit: Biome + typecheck; commit-msg: commitlint / Conventional Commits)
- **CI (`.github/workflows/ci.yml`):** on every push/PR — `bun audit` (fails on high/critical vulnerabilities) → lint → typecheck → test → build. Bun's own package cache (`~/.bun/install/cache`, keyed on `bun.lock`) is cached via `actions/cache`, per [Bun maintainer guidance](https://github.com/oven-sh/bun/discussions/18752) — `node_modules` itself is deliberately _not_ cached (Bun regenerates it fresh from its cache every run, which avoids the stale/corrupted `node_modules` class of bug a direct cache can introduce). Root `package.json`'s `overrides` field pins `nanoid` to a patched version (`3.3.18`) — a transitive dependency of both `postcss` and `@scalar/hono-api-reference`'s dependency tree, fixing a `bun audit`-flagged advisory that a plain `bun update` wouldn't re-resolve on its own.
- **Dependency updates:** Dependabot (`.github/dependabot.yml`) — weekly PRs for `bun` deps (grouped dev/production) and GitHub Actions versions. Every exactly-pinned package (`@biomejs/biome`, `aws-cdk`/`aws-cdk-lib`/`constructs`, `hono`/`@hono/zod-openapi`/`@scalar/hono-api-reference`, `@playwright/test`) is explicitly excluded from its group via `exclude-patterns`, so its bump still gets its own individual PR — a grouped PR would otherwise bundle a pinned package's bump with unrelated ones, defeating the entire reason it's pinned (see CONTRIBUTING.md's Dependency pinning policy). Caught by review — the original config grouped everything with no exclusions.
- **Releases/changelog:** [release-please](https://github.com/googleapis/release-please) (`.github/workflows/release-please.yml`), not Changesets — fully automated from the Conventional Commits already enforced by commitlint, no extra per-PR authoring step. Configured per-workspace-package (`release-please-config.json`/`.release-please-manifest.json`: `.` for repo-root/infra changes, `apps/web`, `apps/api`, `apps/ingestion`, `packages/db`, `packages/shared`), each getting its own `CHANGELOG.md` and version bump on merge. Deliberately **not** publishing anywhere — every package is `"private": true`; this only produces GitHub Releases/tags and changelogs, nothing npm-facing.
- **Editor:** `.vscode/settings.json` and `.vscode/extensions.json` are committed (not gitignored) so Biome-as-formatter and native CSS validation (which doesn't understand `postcss-preset-mantine`'s nesting/`$simple-vars` syntax) are consistent for everyone, not just personal config.

## Directory structure

```
console-next/
├── apps/
│   ├── web/          ← frontend app, its own Bun workspace package
│   ├── api/          ← Hono backend, its own Bun workspace package
│   └── ingestion/    ← scheduled Sportmonks ingestion job — real for `competitions` only, see PROJECT.md
├── infra/            ← AWS CDK hosting stack (not a workspace package — shares the root package.json)
├── packages/
│   ├── db/           ← Drizzle schema + client (Postgres/Neon), consumed by apps/api + apps/ingestion (see ADR 0012)
│   ├── e2e/          ← Playwright Test suite, its own Bun workspace package (see ADR 0009)
│   └── shared/       ← Zod schemas + inferred types for the domain entities
└── docs/
    ├── adr/
    └── plans/        ← persisted plans for Complex tasks, see .claude/CLAUDE.md's Planning section
```

`apps/web/src/` is currently flat (`src/{routes,lib,test}`) since there are no real frontend features yet — just the scaffold. There's no `src/hooks/`, `src/stores/`, or `components/ui/` on disk either: empty placeholder directories aren't tracked by git (a fresh clone wouldn't have had them, since git doesn't track empty dirs — the same "decorative declaration" class of issue as the removed `.nvmrc`), and Mantine ships its own pre-built components so there's no owned `ui/` source to keep in the first place (unlike the earlier shadcn/ui setup). `src/hooks/` and `src/stores/` get created for real the moment the first custom hook or Zustand store actually exists — see "Promote to shared space" below — not before.

Deployables live under `apps/` (`web`, `api`, `ingestion`), shared internal libraries under `packages/` (`db`, `e2e`, `shared`) — see `docs/adr/0011-apps-and-packages-workspace-restructure.md` for the convention and why it replaced the frontend-as-root-package layout.

**Colocate inside the route, not in a parallel `features/` tree.** TanStack Router's file-based routing already gives colocation for free: prefix a file or folder with `-` and the router excludes it from the route tree while still letting you import it normally.

```
apps/web/src/routes/
├── posts.tsx
├── -posts-table.tsx      ← colocated, not a route
├── -components/
│   ├── header.tsx
│   └── footer.tsx
```

**Promote to shared space only once something is actually shared.** Start route-local; move to `src/lib/` or `src/hooks/` only when a second route needs it. A `../../../` relative import is the signal something's in the wrong place — it means reaching across route boundaries instead of using the `@/*` alias or promoting the code.

**Cross-cutting concerns get treated like an internal library, not glued in.** If something (a data-fetching layer, a set of generic UI atoms) grows past "shared utility" into its own coherent thing, that's the seam to consider extracting it into its own workspace package — this is no longer hypothetical: `apps/api` is exactly that kind of extraction, already done.

Sources: [TanStack Router — Routing Concepts](https://tanstack.com/router/latest/docs/routing/routing-concepts) · [8 months of TanStack Router in production](https://swizec.com/blog/tips-from-8-months-of-tan-stack-router-in-production/)

## Commands

```sh
bun install                        # installs the whole workspace (apps/web, apps/api, apps/ingestion, packages/db, packages/e2e, packages/shared)
bun run dev                        # frontend dev server — delegates to apps/web (bun run --filter ./apps/web dev)
bun run build                      # frontend typecheck (apps/web's own tsconfig) + production build — delegates to apps/web
bun run test                       # vitest run — delegates to apps/web, packages/shared, apps/ingestion, apps/api (apps/api also runs scripts/check-openapi.ts, guarding /doc and /reference)
bun run test:coverage              # vitest run --coverage — apps/web only
bun run lint                       # biome check — whole workspace (apps/web, apps/api, infra/), file-tree-based, not workspace-filtered
bun run lint:fix                   # biome check --write
bun run typecheck                  # tsc -b --noEmit — whole workspace, via project references (apps/web, apps/api, apps/ingestion, packages/db, packages/e2e, packages/shared, infra)
bunx playwright install chromium   # one-time browser binary download, not part of bun install
bun run e2e                        # playwright test — delegates to packages/e2e; also runs in CI now

cd apps/api && PORT=4100 bun run dev  # backend dev server (bun --watch)
bunx cdk synth                     # synthesize the CDK hosting stack (see infra/)
```

**Browsable API reference:** with the backend running, open
[`http://localhost:4100/reference`](http://localhost:4100/reference) — a Scalar UI over the OpenAPI 3.1
document at `/doc`. `/` redirects there, so the port alone is enough to find it.

An explicit `PORT` is used above rather than Bun's default: port 3000 can already be bound by another
process without a bind error, so requests silently reach something else (see `apps/api`'s `run-api`
skill for the full gotcha). `4100` matches what that skill and its smoke script use.

Root `package.json` no longer holds the frontend's own scripts directly — `dev`/`build`/`preview`/`test:watch`/`test:coverage` are one-line delegations to `apps/web` via Bun's `bun run --filter <path> <script>` (see `docs/adr/0011-apps-and-packages-workspace-restructure.md`); `codegen` delegates to `apps/web` and `packages/shared` (see ADR 0013 for why `packages/shared` needs its own codegen step); `test` delegates to `apps/web`, `packages/shared`, and `apps/ingestion`; `lint`/`typecheck` stay as they were, since Biome's includes and `tsc -b`'s project references already operate tree-wide regardless of workspace boundaries.

## Deferred (chosen, not yet wired up)

- **E2E:** `packages/e2e` — a third workspace package holding a real Playwright Test suite, separate from both `apps/web` and `apps/api` (see `docs/adr/0009-e2e-as-own-workspace-package.md` for why: E2E naturally spans both, unlike a unit test). `bunx playwright install chromium` for the browser binary — a separate ~270MB download, cached outside the repo, not part of `bun install`. Playwright's own `webServer` config manages the dev server's lifecycle — no hand-rolled background-launch/poll/kill script. Currently one smoke test (`tests/smoke.spec.ts`) proving the scaffold renders with zero console errors; add real flow coverage once a real interactive feature exists.
- **Error tracking** (e.g. Sentry) — zero production observability right now; add before shipping anything real. Bundle source map upload/strip (see Known quirks) belongs here.
- **Deployment target** — decided: AWS S3 + CloudFront via CDK (see `docs/adr/0007-aws-s3-cloudfront-hosting.md`). SPA-fallback routing and a CSP/security-headers policy are built into `infra/`; a per-request nonce for a _stricter_ CSP (dropping `unsafe-inline`) is still deferred, along with the build-time-vs-runtime env var strategy for promoting one build across environments — neither is needed until there's a real deploy pipeline and more than one environment.
- **Actually deploying** — `cdk bootstrap`/`cdk deploy` haven't run against any AWS account. Needs: a confirmed AWS account, an OIDC-federated IAM role for GitHub Actions (no long-lived keys), a CI deploy job (`push: main` only, its own concurrency group so an in-flight deploy can't be cancelled by the existing lint/test job's `cancel-in-progress`), and the sourcemap-stripping decision from Known quirks resolved at the sync step.
- **Backend runtime target** (`apps/api`) — interim target is **Render** (API + scheduled ingestion job), with a planned migration to AWS Lambda/Fargate once an AWS account is confirmed and approved (see `docs/adr/0010-render-and-neon-for-backend-hosting.md`). Routes are written as plain Hono handlers so this migration defers cleanly — the same code runs unchanged under Bun locally, on Render, or on Lambda via `hono/aws-lambda` (see `docs/adr/0008-hono-rest-openapi-backend.md`).
- **Backend test setup** (`apps/api`) — no test runner wired up yet; `apps/web`, `packages/shared`, and `apps/ingestion` all run under `jsdom`/`node`-environment Vitest, `apps/api` doesn't. Needs a `node`-environment Vitest config (either a `test.projects` entry in the root config, or its own standalone one) once there's real behavior worth testing — not added yet because there are zero test files to run.
- **Backend first feature/domain and database** — a football-analytics platform (Sportmonks ingestion, Postgres via Drizzle on Neon, match-report/player-comparison API) is the current direction (`PROJECT.md`). `packages/shared` (Zod schemas) and `packages/db` (Drizzle schema + client, see `docs/adr/0012-packages-db-and-bun-sql-driver.md`) are both built and, as of 2026-08-14, a real Neon project + `local-dev` branch exist with the migration applied; `apps/ingestion` calls `packages/db`'s client for one entity (`competitions`). `apps/api` still doesn't — no real route needs DB access yet — see `docs/adr/0010-render-and-neon-for-backend-hosting.md` for the hosting side of that decision.

## Known quirks

- `vite-plugin-bundlesize` v0.3.0 silently ignores `**/*.css` limit entries — verified empirically (set to `1 kB` against a 5kB actual file, build still passed). Only JS chunks are enforced. Re-check this if the plugin gets a version bump.
- `bun.lock`'s trailing commas are intentional (Bun's own JSONC-like lockfile format, chosen for cleaner diffs) — not a bug. `.vscode/settings.json` maps it to the `jsonc` language so editors stop flagging it as a JSON syntax error.
- `apps/web/src/test/setup.ts` mocks `window.matchMedia` — jsdom doesn't implement it, and Mantine's color-scheme detection (`defaultColorScheme="auto"`) needs it to avoid throwing on mount in every test that renders `MantineProvider`.
- Route components live in colocated `-*.tsx` files (e.g. `apps/web/src/routes/-index-page.tsx`), not directly in the route file (`index.tsx` just imports and wires one up). Exporting a component straight from a route file breaks TanStack Router's `autoCodeSplitting` — it warned explicitly when we tried it. Test files for these follow the same `-` prefix (e.g. `-index-page.test.tsx`) so the router doesn't try to treat them as routes too.
- `axe-core`'s `color-contrast` rule is explicitly disabled in tests, not just left to fail — jsdom has no layout engine (`Range#getClientRects` etc. are stubs, and this is true even with the `canvas` package installed, which only patches image/font metrics, not layout), so the check can never fully evaluate and would otherwise sit in `results.incomplete` forever. Real contrast checking needs a real browser; covered when Playwright E2E lands.
- `bun audit --audit-level=high` in CI has no allowlist for an advisory with no available fix (e.g. a transitive dev-dependency) — Bun has no `.auditignore`-equivalent today. Until one exists, an unfixable high/critical advisory blocks every push/PR regardless of relevance; resolving it is a manual `bun audit --json` triage, not an automatic bypass.
- `build.sourcemap: "hidden"` in `apps/web/vite.config.ts` only suppresses the `//# sourceMappingURL` comment — the `.js.map` files still get written into `apps/web/dist/` and are servable if nothing strips them post-build. There's deliberately no strip-or-upload step yet, since that's normally wired up alongside source map upload to an error tracker (see Deferred: Error tracking) once a deployment target exists — don't ship `dist/` as-is to anything public before that lands.
- **Build output now lands at `apps/web/dist/`, not repo-root `dist/`** (ADR 0011) — relevant the moment a real S3 sync step gets written (`TODO.md`).
- Bun workspace installs don't hoist dependencies to the root `node_modules` — `hono` (an `apps/api` dependency) doesn't appear under `node_modules/hono` at all. Each workspace package gets its own `node_modules/` with symlinks into a shared `node_modules/.bun` store (e.g. `apps/api/node_modules/hono -> ../../../node_modules/.bun/hono@4.13.1/node_modules/hono`). One `bun.lock` for the whole repo either way — this is just a different on-disk layout than npm/Yarn's hoisting, not a broken install if `find node_modules/hono` comes up empty.
- `bun run codegen`'s `apps/web` step (`tsr generate`, which `build`/`typecheck` both run first) prints `Warning: Accessing non-existent property 'replaceRouteChunk' of module exports inside circular dependency` on every run, locally and in CI. Benign — a circular-dependency artifact inside `@tanstack/router-cli`/`router-plugin` itself, not this project's code; exit code is always 0 and the generated `routeTree.gen.ts` is correct either way. `bun run codegen`'s other step (`packages/shared`, deriving Zod schemas from `packages/db`'s Drizzle tables — ADR 0013) has no equivalent quirk.

## Contributing / security

Dev workflow notes are in [`CONTRIBUTING.md`](./CONTRIBUTING.md); vulnerability reporting is in [`SECURITY.md`](./SECURITY.md). No `CODEOWNERS` or PR/issue templates — those earn their keep with more than one contributor, and this is currently solo.

[`.claude/CLAUDE.md`](./.claude/CLAUDE.md) is a project-level instructions file for Claude Code — hand-written, not `/init`-generated, kept short by linking to this README/`CONTRIBUTING.md`/`docs/adr/` instead of restating them. `./CLAUDE.md` and `./.claude/CLAUDE.md` load identically; `.claude/` was chosen to group it with whatever rules/skills/commands/settings join it later (see `TODO.md`) rather than leaving those scattered at the repo root. Every `apps/*`/`packages/*` directory plus `infra/` now has its own `.claude/CLAUDE.md` too (per-directory files load only on demand when Claude reads there) — each stays short and defers to the root file instead of restating it, adding only what's actually specific to that directory.

Five `.claude/skills/` exist:

- `new-adr` / `new-workspace-package` (repo-root `.claude/skills/`) — lift `CONTRIBUTING.md`'s ADR-writing and workspace-package checklists into invocable `/new-adr`/`/new-workspace-package` commands (custom commands and skills are the same mechanism in current Claude Code).
- `commit` (repo-root `.claude/skills/`) — Conventional Commits format, branch naming, and the branch-only PR workflow (no direct commits to `main`, no `Co-Authored-By: Claude` trailer) in one place, model-invoked so it fires on any commit without needing to be typed, added 2026-08-13 after a run of PRs that weren't consistent with each other on exactly these points.
- `run-console` (`apps/web/.claude/skills/`) and `run-api` (`apps/api/.claude/skills/`), each colocated with the unit it drives — produced by `/run-skill-generator`, one per deployable unit. Each launches its app for real and drives it (`run-console` now delegates to the real `packages/e2e` Playwright Test suite rather than the bespoke driver script it started with; `run-api` uses a `curl`-based smoke script), documenting only commands actually run and verified, not paraphrased from other docs. `run-api` surfaced a real gotcha worth knowing generally: port 3000 can have two listeners at once (broad `*:3000` vs. loopback-only `[::1]:3000`) with no bind error, silently routing requests to the wrong process — see that skill's Gotchas section.

`/verify` (bundled) hasn't been run yet — it requires typing the slash command directly, since it's user-only (`disable-model-invocation: true`).

Task tracking is [`TODO.md`](./TODO.md) — the [todo-md](https://github.com/todo-md/todo-md) standard, chosen over GitHub Issues to keep task tracking in the repo alongside everything else here (ADRs, decisions), rather than the first thing living outside it. Claude Code tooling/meta tasks (skills, settings, hooks) are tracked separately in [`.claude/TODO.md`](./.claude/TODO.md).

## License

Proprietary — all rights reserved. See [`LICENSE`](./LICENSE). This is a personal/learning project, not published or licensed for reuse.
