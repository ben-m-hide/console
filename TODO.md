# TODO

Task tracking for console-next, following the [todo-md](https://github.com/todo-md/todo-md) standard: `- [ ]` open, `- [x]` done, `- [-]` declined. See `docs/adr/` and `README.md` for the reasoning behind any item — this file is the action list, not the rationale.

## Backend

- [ ] Pick the backend's first real feature/domain (m3ter-flavored toy domain vs. arbitrary — still open, see ADR 0008)
- [ ] Wire up a test setup for `packages/api` once there's real behavior worth testing (`node` environment, not the root's `jsdom`)
- [ ] Decide backend deploy runtime target: Lambda + API Gateway vs. Fargate/ECS (see ADR 0008) — blocked on having an AWS account

## Deployment

- [ ] Get/confirm an AWS account to deploy into
- [ ] `cdk bootstrap` + first real deploy of the hosting stack (see ADR 0007)
- [ ] OIDC-federated IAM role for GitHub Actions (no long-lived keys) + a CI deploy job
- [ ] Sourcemap strip/upload strategy, tied to error tracking setup

## Observability

- [ ] Error tracking (e.g. Sentry) — zero production observability right now

## Testing

- [ ] Playwright E2E — add once there's a real user flow worth covering

## Tooling / project setup

- [ ] Project-level `CLAUDE.md` (split off as its own task, not forgotten)
- [ ] Push to a real GitHub remote — there is currently none (`git remote -v` is empty), so CI has never actually executed on GitHub's runners; every "CI passes" claim so far is from reproducing the exact command sequence locally, not a real run

## Follow-up from adversarial review (2026-08-10)

- [ ] Set `connect-src` to the API's actual origin once the Lambda-vs-Fargate/domain decision lands — currently an explicit `'self'` placeholder (see ADR 0007/0008 cross-reference)

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

## Fixes from adversarial review (2026-08-10)

- [x] Fixed `bun run build`/`typecheck` genuinely failing on a clean checkout — `tsc -b` ran before anything generated `src/routeTree.gen.ts` (gitignored, generated by the router plugin). Added a standalone `codegen` script (`tsr generate`, via `@tanstack/router-cli`) that both `build` and `typecheck` now run first. Reproduced the failure and the fix by actually deleting the file and re-running each script, not just reading the error.
- [x] Added an explicit `connect-src 'self'` to the CSP — was implicitly falling back to `default-src 'self'`, which would silently block the frontend calling the API the moment that's wired up. A recorded placeholder now, not an invisible gap.
- [x] Pinned every GitHub Action to a commit SHA (`actions/checkout`, `oven-sh/setup-bun`, `actions/cache`, `googleapis/release-please-action`) with the resolved version as a trailing comment — CI was the one place the project's own stated pinning policy (`CONTRIBUTING.md`) wasn't applied to itself. Added `permissions: contents: read` to `ci.yml` (least privilege; it had none before).
- [x] Removed the empty, untracked `src/hooks/`/`src/stores/` directories and corrected the README's directory diagram — git doesn't track empty dirs, so they wouldn't have existed on a fresh clone despite being listed.
- [x] Verified (didn't just accept) `setup-bun@v2`'s `packageManager`-field auto-detection claim against its own README — confirmed real, one reviewer sub-claim that didn't hold up.
