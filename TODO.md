# TODO

Task tracking for console-next, following the [todo-md](https://github.com/todo-md/todo-md) standard: `- [ ]` open, `- [x]` done, `- [-]` declined. See `docs/adr/` and `README.md` for the reasoning behind any item — this file is the action list, not the rationale. Claude Code tooling/meta tasks (skills, settings, hooks) are tracked separately in [`.claude/TODO.md`](.claude/TODO.md) — this file is product/repo tasks only.

## Backend

- [ ] Wire up a test setup for `apps/api` once there's real behavior worth testing (`node` environment, not `apps/web`'s `jsdom`)
- [ ] Migrate backend compute from Render to AWS Lambda/Fargate + EventBridge once an AWS account is confirmed and approved (see ADR 0010) — update `connect-src` again at that point

## Football analytics domain (see `PROJECT.md`, ADR 0010)

- [ ] Confirm the football-analytics domain as the backend's first real feature (schema, ingestion job, API surface) rather than leaving it open per ADR 0008
- [ ] Decide ingestion deploy shape — same Render image/different entrypoint vs. a separate service — deliberately deferred to build time (PROJECT.md §10), not decided now
- [ ] Define the `/players/compare` percentile baseline explicitly when built: same position + competition + season, minimum 450 minutes played (PROJECT.md §4)
- [ ] Don't display team logos or player photos — Sportmonks' terms require separately-sourced rights for those; use text/initials/placeholder icons instead (PROJECT.md §9)
- [ ] Add `SPORTMONKS_API_KEY` to `.env.example` once `apps/ingestion` has real Sportmonks integration (Phase 4)
- [ ] Add basic rate limiting on public API endpoints (e.g. `hono-rate-limiter`) once real routes exist (PROJECT.md §9)
- [ ] Confirm whether Sportmonks exposes a delta/"updated since" fixture-fetch endpoint before building the ingestion job — fall back to a rolling-window re-fetch (e.g. last 14 days) if not (PROJECT.md §3)
- [x] Run `packages/db`'s generated migration once a Neon project exists — done 2026-08-14: Neon project created, a `local-dev` branch (PROJECT.md §7) holds local dev data, `bun run db:migrate` applied `drizzle/0000_*.sql` successfully, verified against `information_schema.tables` (all 10 tables present). Needed adding `postgres` (postgres.js) as a `packages/db` devDependency — `drizzle-kit`'s CLI needs a real driver package installed to actually connect, independent of the app's own `drizzle-orm/bun-sql` runtime driver (ADR 0012 unaffected, that decision was about runtime code, not CLI tooling).
- [x] Confirm the pooled connection string works end-to-end, and decide on cold-start tolerance — done 2026-08-14: `createDb()` against the pooled string ran a real query successfully (192ms first query, ~11ms warm). Decided **no app-level retry wrapper** — Bun's `SQL` client already retries a cold Neon compute with backoff up to its 30s default `connectionTimeout` (confirmed via the installed `bun-types` package, not docs prose), well past Neon's own ~few-hundred-ms typical wake time; see ADR 0012's "Consequences" and the comment in `packages/db/src/client.ts`. Revisit only if `apps/ingestion` shows real timeouts in practice.
- [ ] Add `DATABASE_URL` to both apps' `.env.example` once `createDb()` is actually wired into `apps/api`/`apps/ingestion` (PROJECT.md §7)
- [ ] Add `CHECK` constraints to `match_events` scoping `outcome`/`body_part`/`situation` by `type`, once Phase 4's Sportmonks API client surfaces the real `type`/`sub_type_id` values (deliberately not guessed — see ADR 0012, PROJECT.md §11 Phase 2)
- [ ] Do a thin vertical slice before further schema/API elaboration — Phase 4's real Sportmonks client is exactly that; §2/§5 have already needed two "Correction, Phase 3" reversals against reality, a sign the design is running ahead of what's been verified against a real API call. Don't speculate further on Phase 5's API contract until Phase 4 has one real row in the DB.

## Deployment

- [ ] Get/confirm an AWS account to deploy into
- [ ] `cdk bootstrap` + first real deploy of the hosting stack (see ADR 0007)
- [ ] OIDC-federated IAM role for GitHub Actions (no long-lived keys) + a CI deploy job
- [ ] Sourcemap strip/upload strategy, tied to error tracking setup
- [ ] Build the backend CD pipeline: Docker build, `drizzle-kit migrate` as an explicit pipeline step, deploy to Render (PROJECT.md §8) — not blocked by the AWS-account guardrail, can land independently of frontend CD

## Observability

- [ ] Error tracking (e.g. Sentry) — zero production observability right now

## Testing

- [x] **`packages/shared` has zero tests** — done 2026-08-13, alongside ADR 0013 (generating these schemas from Drizzle). `vitest.config.ts` (`node` environment) + `src/schemas/schemas.test.ts`, covering the happy path, nullability, and the two numeric-bound overrides (`Competition.tier`, `BallPosition.x`/`y`). Wired into root `bun run test`.
- [ ] Real E2E coverage in `packages/e2e/` beyond the one smoke test — add flow coverage once a real interactive feature exists (see ADR 0009), and a cross-package test once the frontend actually calls the backend
- [ ] No integration testing exists across any layer yet — CDK is `synth`-only, the API has a `curl` smoke test only, `packages/db`'s schema is verified via `drizzle-kit generate` only (no live DB), and the frontend has never made a real request to the API (`connect-src` is still a `'self'` placeholder). Expected at this stage, not a bug — but CORS, connection-string format, and Zod/DB schema drift are all still ahead, undiscovered, right at the point the wiring items above actually connect these pieces. Worth deliberately testing each new connection point as it's wired, not just trusting each layer's isolated verification.
- [ ] Test coverage reports with deltas as a CI PR comment — coverage % plus the diff vs. the base branch, not just the local `test:coverage` HTML report (e.g. `davelosert/vitest-coverage-report-action`, which needs `@vitest/coverage-v8`'s `json-summary` reporter enabled). Tool choice not decided, just the capability. Needs `pull-requests: write` scoped to just that step (current `ci.yml` is `contents: read` only) and the action pinned to a commit SHA like every other CI action (`CONTRIBUTING.md`'s pinning policy). Related to the existing `coverage.thresholds` BACKLOG item below but distinct — visibility, not enforcement.

## Tooling / project setup

- [x] Bundle-size PR comments in CI — done 2026-08-13, new `.github/workflows/bundle-size.yml` using `preactjs/compressed-size-action` (verified via GitHub's API before adding: actively maintained, 654 stars, auto-detects Bun from the lockfile, default file pattern `**/dist/**/*.{js,mjs,cjs}` matches `apps/web/dist/` with no customization needed, reuses the existing `bun run build` script unmodified). Kept as its own workflow rather than a step in `ci.yml`, same reasoning as `release-please.yml` being separate — it needs `pull-requests: write` to post/update the comment, and `ci.yml`'s `contents: read` shouldn't be broadened just for one step. Pinned to the release commit SHA (`f322c295d...` = `v2.10.0`), YAML verified to actually parse.
- [x] Set up a workflow from GitHub's security/code-scanning template picker — done 2026-08-13, `.github/workflows/dependency-review.yml` using `actions/dependency-review-action` (verified via GitHub's API before adding: official `actions/` org, actively maintained, pushed the same day). **CodeQL was already active** (confirmed via the browser 2026-08-13: "Default setup", recent scan) so this fills the actual gap instead — diffs a PR's dependency changes specifically and fails on a newly-introduced known-vulnerable package, which `bun audit` doesn't do (that only checks the current lockfile state, not what a given PR changed). Configured `fail-on-severity: high` and `fail-on-scopes: runtime, development` to match `bun audit --audit-level=high`'s existing threshold rather than the action's own looser defaults (`low` severity, `runtime`-only scope). Kept as its own workflow, same `pull-requests: write` reasoning as `bundle-size.yml`. Pinned to the release commit SHA, YAML verified to parse.
- [x] Factored the 8 duplicated tsconfig strictness blocks into a shared `tsconfig.base.json` — done 2026-08-13, from an architecture review's second candidate. 7 files (`apps/api`, `apps/ingestion`, `packages/db`, `packages/e2e`, `packages/shared`, `infra`, `apps/web/tsconfig.app.json`) now `extends` it; `apps/web/tsconfig.node.json` left alone (shares almost nothing with the common block — extending it would cost more override lines than it'd save). `extends` under TS7's `tsc -b` composite build was spiked and verified first (no prior use of it anywhere in this repo), including confirming `infra`'s `exactOptionalPropertyTypes: false` override is genuinely load-bearing (reproduced the underlying `aws-cdk-lib` `Bucket`/`IBucket` type failure by temporarily removing it). No ADR — trivially reversible, doesn't clear that bar.

## Follow-up from adversarial review (2026-08-10)

- [ ] Set `connect-src` to the API's actual origin once it's deployed to Render — currently an explicit `'self'` placeholder (see ADR 0007/0008 cross-reference); will need updating again on the later AWS migration (ADR 0010)

# BACKLOG

- [ ] Give `apps/web/src/lib/query-client.ts`'s `QueryClient` a construction seam (`createQueryClient()` factory instead of a module-level singleton) — third candidate from the 2026-08-13 architecture review, rated "Worth exploring" not "Strong": only one adapter exists today (`-index-page.test.tsx` already routes around it, wrapping just `MantineProvider`, not `QueryClientProvider`), so the seam is hypothetical until a component actually calls `useQuery`. Worth doing at that point, not necessarily before.
- [ ] Generate Zod schemas for `squad_memberships`/`ingestion_runs` too (currently Drizzle-only, no JSON-boundary validation need today) — revisit if either ever needs one; see ADR 0013's Consequences
- [ ] Stricter CSP via a CloudFront Function nonce, dropping `style-src 'unsafe-inline'` (currently needed for Mantine's runtime styles — see ADR 0007)
- [ ] Custom domain + ACM + Route53 for CloudFront (confirmed non-breaking to add later, just not needed yet)
- [ ] `bun audit` allowlist for a genuinely unfixable advisory — blocked on Bun tooling (no `.auditignore`-equivalent exists yet). **2026-08-14: the nanoid `<3.3.18` advisory that motivated this item turned out fixable**, not a real instance of the gap — `postcss`'s own `nanoid` range (`^3.3.17`) already permitted the patched `3.3.18`, just hadn't re-resolved; fixed via a root `overrides` field (`package.json`), no allowlist needed. Left open because the underlying gap is real: `overrides` only helps when a non-vulnerable version exists within every consumer's declared range (here, both `postcss`'s `^3.3.17` and `@scalar/types`'s `^5.1.6` happened to collapse safely onto `3.3.18` — verified via `apps/api`'s `/reference` smoke test, not assumed). A genuinely unfixable advisory (no compatible patched version anywhere in the tree) still has no escape hatch, and `--audit-level=high` would still block every PR indefinitely when that happens. Worth deciding whether `--audit-level=critical` is the safer default until the allowlist mechanism exists — a real severity-vs-availability trade-off, not something to change silently.
- [ ] Coverage thresholds (`coverage.thresholds`) once there's enough real code for a number to mean something
- [ ] API docs UI beyond Scalar (e.g. a generated typed client from the OpenAPI spec) — no consumer for one yet

# DONE

## Scaffold

- [x] Grilling session to decide the stack: Bun, single package, Vite + React SPA, TanStack Router, TypeScript 7 strictest, Biome, Vitest + RTL
- [x] ADRs 0001–0005 (SPA over meta-framework, Bun, TypeScript 7, Biome, foundation libraries: Zustand/TanStack Query/TanStack Form/Zod)
- [x] Automatic import ordering/grouping via Biome's `organizeImports`
- [x] lefthook pre-commit hooks + commitlint (Conventional Commits)

## Production readiness

- [x] CI (`.github/workflows/ci.yml`): lint, typecheck, test, build, `bun audit`
- [x] Accessibility testing via `axe-core` run directly in tests
- [x] Bundle size budget via `vite-plugin-bundlesize`
- [x] Dependabot for `bun` deps + GitHub Actions versions

## Styling migration

- [x] Replaced Tailwind v4 + shadcn/ui + Base UI with Mantine (ADR 0006)

## Tooling hardening (post-review)

- [x] Fixed the a11y test blind spot: assert `results.incomplete` empty too, not just `results.violations`; explicitly disabled `color-contrast` (jsdom has no layout engine) instead of leaving it silently unevaluated
- [x] Pinned `@biomejs/biome` exactly so nursery-rule drift lands with its own version-bump PR, not a random unrelated one
- [x] Removed `src/lib/env.ts` — validated only Vite's own guaranteed env fields, ~16kB gzip for zero real value
- [x] Removed the unenforceable `engines.node`/`.nvmrc` pin (confirmed Bun doesn't check it, and nothing in the toolchain shells out to Node anyway)
- [x] Wired up the previously-unused `@vitest/coverage-v8` (`test:coverage` script)
- [x] Added Bun install cache to CI (`~/.bun/install/cache`, keyed on `bun.lock`, per Bun maintainer guidance)

## AWS hosting infra

- [x] CDK stack: private S3 + CloudFront (OAC) + SPA fallback + security-headers/CSP policy (ADR 0007), verified via `cdk synth`

## Backend

- [x] Hono + REST/OpenAPI backend as a Bun workspace (`packages/api`), over tRPC/Express/Fastify/NestJS (ADR 0008)
- [x] `GET /health`, `/doc` (OpenAPI spec), `/reference` (Scalar UI) — spike only, verified via `app.request()`

## Documentation

- [x] ADR index (`docs/adr/README.md`)
- [x] `LICENSE` (proprietary/all-rights-reserved)
- [x] Prettier for Markdown only (Biome doesn't support it yet — confirmed against [biomejs/biome#3718](https://github.com/biomejs/biome/issues/3718))
- [x] `release-please` for automated per-package CHANGELOG/versioning from existing Conventional Commits
- [x] `SECURITY.md`, `CONTRIBUTING.md`
- [x] This file
- [x] Project-level `CLAUDE.md` — researched Claude Code's actual CLAUDE.md/monorepo docs first (not guessed), hand-written rather than `/init`-generated, kept under 200 lines by linking to README/CONTRIBUTING/ADRs instead of duplicating them
- [x] `.claude/skills/new-adr` and `.claude/skills/new-workspace-package` — codify `CONTRIBUTING.md`'s ADR-writing and workspace-package checklists as invocable skills, researched against Claude Code's actual skills docs (rules vs. skills vs. subagents, `.claude/commands/` now merged into skills) rather than guessed
- [x] `.claude/skills/run-console` and `packages/api/.claude/skills/run-api` via `/run-skill-generator` — both actually launched, driven, and verified (not paraphrased): the frontend originally via a bespoke Playwright screenshot driver (`chromium-cli` unavailable here, used the generator's own documented fallback), the backend via a `curl` smoke script. Found and documented a real gotcha in the process — two processes can both "successfully" listen on port 3000 (broad `*:3000` vs. loopback-only `[::1]:3000`) with no bind error, silently answering requests from the wrong one. Pulled the deferred Playwright dependency forward deliberately (confirmed with you first) rather than adding it silently.
- [x] `packages/e2e` as its own workspace package (ADR 0009) — moved off the root package.json, swapped the bare `playwright` library for the real `@playwright/test` runner, replaced the hand-rolled background-launch/poll/kill sequence with Playwright's own `webServer` config, rewrote `run-console` to point at the real suite instead of the bespoke driver (deleted). Verified passing via `bunx playwright test`, screenshot actually looked at, not just trusted.

## Football analytics — Phase 0 (2026-08-11)

- [x] Signed up for Render and Neon (ADR 0010) — no service/project configured yet, accounts only
- [x] Scaffolded `apps/ingestion` (empty deployable, `bun run dev`/`typecheck`) and `packages/shared` (empty library, `export {}` placeholder) as new Bun workspace members, per ADR 0011's `apps/` (deployables) vs `packages/` (shared libraries) convention and PROJECT.md §11 Phase 0. Wired into root `tsconfig.json` references, `release-please-config.json`/`.release-please-manifest.json` (both start at `0.0.0`), and README's Stack/Directory-structure/Commands sections. Verified via the full pipeline (lint, typecheck, test, build, `bun audit`).

## E2E in CI (2026-08-11)

- [x] Wired `packages/e2e` into CI — added a root `e2e` script (`bun run --filter ./packages/e2e test`, matching the existing `dev`/`build`/`test` delegation pattern) and two steps to `ci.yml` (`bunx playwright install --with-deps chromium`, then `bun run e2e`). Verified by actually running it locally the same way CI will (`CI=1 bun run e2e`), not just adding the YAML.

## Remote (2026-08-11)

- [x] Pushed to a real GitHub remote — `github.com/ben-m-hide/console`, over a dedicated personal SSH key + host alias (this is a work laptop otherwise signed into a company GitHub via `gh`/HTTPS); rewrote existing local commit authors from the work git identity to the personal one first, since that history predated the remote and hadn't been pushed anywhere yet. CI now runs for real on GitHub's runners instead of only being reproduced locally.

## Workspace restructure (2026-08-11)

- [x] Moved the frontend from the workspace root into `apps/web`, and `packages/api` into `apps/api` (ADR 0011, supersedes ADR 0008's original rejection of this) — new `apps/web/package.json`/`tsconfig.json`, root `package.json`/`tsconfig.json` slimmed to workspace-root/tooling/infra-deps only, root scripts delegate to `apps/web` via Bun's `--filter`. Fixed every concrete consequence found tracing the config graph: `.gitignore`'s path-anchored `routeTree.gen.ts` entry, `.vscode/settings.json`'s Mantine CSS lookup path, `release-please` manifest/config path rename plus a new `apps/web` entry, and moved `run-console` to `apps/web/.claude/skills/` to match `run-api`'s colocation. Verified via the full pipeline plus `packages/e2e`'s Playwright suite and `cdk synth`.

## Fixes from adversarial review (2026-08-11)

- [x] Fixed `.github/dependabot.yml` grouping every dev/production dependency together with no exclusions — meant an exactly-pinned package's bump (Biome, `aws-cdk-lib`, `hono`, `@playwright/test`, etc.) would land bundled into an unrelated weekly PR, defeating the entire reason it's pinned. Added `exclude-patterns` to both groups so every pinned package still gets its own individual PR. Verified the resulting YAML actually parses (installed `pyyaml`, loaded it), not just eyeballed the indentation.
- [x] Added an honest addendum to ADR 0009 acknowledging a fair "Simplicity first" tension raised by review (a third workspace package + formal ADR for one smoke test) — recorded as a real, deliberate bet rather than dismissed or silently reverted, since it was a discussed decision, not unrequested scaffolding.

## Fixes from adversarial review (2026-08-10)

- [x] Fixed `bun run build`/`typecheck` genuinely failing on a clean checkout — `tsc -b` ran before anything generated `src/routeTree.gen.ts` (gitignored, generated by the router plugin). Added a standalone `codegen` script (`tsr generate`, via `@tanstack/router-cli`) that both `build` and `typecheck` now run first. Reproduced the failure and the fix by actually deleting the file and re-running each script, not just reading the error.
- [x] Added an explicit `connect-src 'self'` to the CSP — was implicitly falling back to `default-src 'self'`, which would silently block the frontend calling the API the moment that's wired up. A recorded placeholder now, not an invisible gap.
- [x] Pinned every GitHub Action to a commit SHA (`actions/checkout`, `oven-sh/setup-bun`, `actions/cache`, `googleapis/release-please-action`) with the resolved version as a trailing comment — CI was the one place the project's own stated pinning policy (`CONTRIBUTING.md`) wasn't applied to itself. Added `permissions: contents: read` to `ci.yml` (least privilege; it had none before).
- [x] Removed the empty, untracked `src/hooks/`/`src/stores/` directories and corrected the README's directory diagram — git doesn't track empty dirs, so they wouldn't have existed on a fresh clone despite being listed.
- [x] Verified (didn't just accept) `setup-bun@v2`'s `packageManager`-field auto-detection claim against its own README — confirmed real, one reviewer sub-claim that didn't hold up.

## Football analytics — Phase 1 & 2 schema (2026-08-12)

- [x] Phase 1: Zod schemas + inferred types for all 8 entities in `packages/shared/src/schemas/`, barrel-exported (one file per entity, plus a `schemas/index.ts` barrel — see the barrel-export feedback note).
- [x] Phase 2: Drizzle schema for all 10 tables in a new `packages/db` workspace package (not in the original `PROJECT.md` plan — see ADR 0012 for why it's its own package and why `drizzle-orm/bun-sql` over `@neondatabase/serverless`), plus a generated initial migration (`packages/db/drizzle/0000_*.sql`, no live DB needed for `drizzle-kit generate`). Not yet run — no Neon project exists — and not yet wired into `apps/api`/`apps/ingestion`.
- [x] Per-directory `.claude/CLAUDE.md` for `apps/ingestion`, `packages/shared`, `packages/e2e`, `infra` (later followed by `packages/db`) — factual/current-state only, no invented skills.
- [x] Fixed the `bun.lock` trailing-comma warning in VS Code — first attempt (a `biome.json` `overrides` entry) turned out to be dead config: `biome check bun.lock` confirmed Biome hardcodes lockfiles as protected and never touches them at all, regardless of config. Reverted that, fixed the real source instead — switched `bun.lock`'s `.vscode/settings.json` file association from `jsonc` to `plaintext`, which has no validator attached at all.

## Review findings + GitHub repo settings (2026-08-12)

- [x] Verified 8 findings from an external review against actual repo state (not trusted at face value) — 4 confirmed and fixed: `squad_memberships` was missing its `sportmonks_id`/`UNIQUE` constraint entirely (a real upsert-idempotency bug, unlike `seasons`/`ball_positions` which just went beyond a paragraph's literal wording), `PROJECT.md` §4 had no documented rationale for the API being unauthenticated, `packages/shared` has zero test coverage, and Neon's pooled-vs-direct connection string distinction (confirmed against Neon's own docs) was undocumented in `packages/db`. Two more filed as open items (thin-vertical-slice-before-more-design note, `bun audit` severity-level trade-off); one (no branch protection on `main`, confirmed via `gh api` returning 404) flagged directly to the user rather than acted on, since it's a GitHub settings change.
- [x] Set up branch protection on `main` via GitHub's Rulesets (require PR, 0 required approvals for solo maintainer, require the `ci` status check, block force pushes, restrict deletions, empty bypass list) and disabled squash merging repo-wide (`Settings → General → Pull Requests`) in favor of rebase-only — squash was writing the PR title as the commit on `main` instead of the actual `commitlint`-validated message, which was silently breaking `release-please`'s Conventional Commits parsing since PR #16. Verified the fix worked end-to-end, not just configured: PR #23 (`release-please`'s own release PR) now shows a correctly parsed changelog entry sourced from a real commit message. Also verified via GitHub's own docs that a ruleset's own "Allowed merge methods" field (which still shows all three methods as its permissive default) can't override a stricter repo-level setting — the repo-level one is the actual gate.
- [x] Confirmed Dependabot alerts, Dependabot security updates, Secret Protection, and push protection were already enabled (checked directly in the browser, since this account's `gh` CLI auth isn't a repo collaborator and returns `null`/404 for anything admin-gated) — plus found CodeQL code scanning already active as a bonus, unprompted. Wiki tab already disabled. Nothing left to change here.
