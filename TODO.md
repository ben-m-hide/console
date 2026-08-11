# TODO

Task tracking for console-next, following the [todo-md](https://github.com/todo-md/todo-md) standard: `- [ ]` open, `- [x]` done, `- [-]` declined. See `docs/adr/` and `README.md` for the reasoning behind any item — this file is the action list, not the rationale.

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

## Deployment

- [ ] Get/confirm an AWS account to deploy into
- [ ] `cdk bootstrap` + first real deploy of the hosting stack (see ADR 0007)
- [ ] OIDC-federated IAM role for GitHub Actions (no long-lived keys) + a CI deploy job
- [ ] Sourcemap strip/upload strategy, tied to error tracking setup
- [ ] Build the backend CD pipeline: Docker build, `drizzle-kit migrate` as an explicit pipeline step, deploy to Render (PROJECT.md §8) — not blocked by the AWS-account guardrail, can land independently of frontend CD

## Observability

- [ ] Error tracking (e.g. Sentry) — zero production observability right now

## Testing

- [ ] Real E2E coverage in `packages/e2e/` beyond the one smoke test — add flow coverage once a real interactive feature exists (see ADR 0009), and a cross-package test once the frontend actually calls the backend

## Tooling / project setup

- [ ] Run `/verify` yourself — bundled, `disable-model-invocation: true`, so I can't invoke it; typing it directly records the real lint/typecheck/test/build/audit recipe into `.claude/skills/verify/`, replacing the guesswork-prone bundled default
- [ ] Populate `.claude/` further as real needs come up — `settings.json`, subagents, per-directory `CLAUDE.md`/path-scoped rules for `infra/`/`apps/web/`/`apps/api/` (see README's Contributing/security section for the trigger on the latter). Nothing pre-built beyond what's already there; add each only when there's an actual repeated task it would serve.

## Follow-up from adversarial review (2026-08-10)

- [ ] Set `connect-src` to the API's actual origin once it's deployed to Render — currently an explicit `'self'` placeholder (see ADR 0007/0008 cross-reference); will need updating again on the later AWS migration (ADR 0010)

# BACKLOG

- [ ] Stricter CSP via a CloudFront Function nonce, dropping `style-src 'unsafe-inline'` (currently needed for Mantine's runtime styles — see ADR 0007)
- [ ] Custom domain + ACM + Route53 for CloudFront (confirmed non-breaking to add later, just not needed yet)
- [ ] `bun audit` allowlist for an unfixable advisory — blocked on Bun tooling (no `.auditignore`-equivalent exists yet)
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
