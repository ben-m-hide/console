# Hono + REST/OpenAPI backend, as a Bun workspace alongside the frontend

## Status

Accepted — `packages/api` scaffolded with one spike route (`GET /health`) and a generated OpenAPI document (`GET /doc`). Verified via `app.request()` in-process (no real port bound) and `bun run lint`/`typecheck`/`audit`. **Not deployed, no real feature built yet.**

## Context

console-next is explicitly a learning/practice project (confirmed, not assumed) — there is no existing backend, no existing API contract, and no real business requirement driving this; the goal is building genuine, transferable full-stack experience. This ADR covers the backend's shape; ADR 0007 covers frontend hosting.

## Decisions

### REST + OpenAPI, over tRPC

tRPC was explained and seriously considered — it gives zero-codegen end-to-end type safety by sharing a TypeScript type across an import boundary, which fits a monorepo well. Rejected in favor of REST + OpenAPI anyway: it's the more universally transferable skill (language-agnostic, not TS-to-TS-only), and it's what the console would need regardless of who else ends up consuming this API later.

### Hono, over Express / Fastify / NestJS

Compared directly:

|                  | Express                         | Fastify                               | Hono                                                              | NestJS                     |
| ---------------- | ------------------------------- | ------------------------------------- | ----------------------------------------------------------------- | -------------------------- |
| TS-native        | No (`@types/express` bolted on) | Partial (JSON Schema native, not Zod) | Yes                                                               | Yes (heavier)              |
| Runtime          | Node-first                      | Node-first                            | **Bun-native**, portable to Lambda/Workers/Deno too               | Built on Express/Fastify   |
| Zod + OpenAPI    | Manual wiring of 2-3 libraries  | Needs a Zod bridge plugin             | `@hono/zod-openapi` — one schema drives validation + spec + types | `@nestjs/swagger`, verbose |
| Ecosystem/hiring | Largest by far                  | Moderate                              | Smaller but growing fast                                          | Large, enterprise-leaning  |

Verified rather than assumed on the "is this a real, current choice" question: direct npm download API query (2026-08-10) showed Hono at ~57M/week against Express's ~127M and Fastify's ~11M — meaningfully mainstream, not a fringe bet, and confirmed in production at Cloudflare (D1, Workers KV), Deno, Clerk, and Unkey.

NestJS was the clearest reject: its module/DI architecture is aimed at larger, longer-lived services with multiple contributors — real overkill for a single-developer console's API that starts with a health check.

### Code-first OpenAPI from Zod, over a hand-written spec

`@hono/zod-openapi`'s `createRoute()` + `OpenAPIHono` means each endpoint's Zod schema is the single source of truth for runtime validation, the generated OpenAPI document (`/doc`), and (eventually) a generated typed client — instead of hand-authoring a spec that can silently drift from the implementation. Reuses `zod`, already a dependency for TanStack Form. Confirmed the peer range before installing: `@hono/zod-openapi@1.5.2` requires `zod@^4.0.0`, satisfied by the already-installed `zod@^4.4.3` — this project narrowly avoided the ecosystem's v3/v4 split.

A hand-written-spec-first workflow was considered — it pairs naturally with **Prism** (a separate tool, an OpenAPI-driven mock server, not a competing framework) for building the frontend against a contract before the backend exists. Not chosen: with no external team consuming a pre-agreed contract, spec-first adds a manual-sync step that code-first Zod schemas avoid entirely.

### One repo, `packages/api` as a Bun workspace — the frontend does _not_ move

Decided against moving `src/` into a `packages/console/` to "properly" symmetrize the monorepo. A Bun workspace root doesn't need to be dependency-free, and every path that just went green after the ADR 0007 work — `vite.config.ts`'s alias, three tsconfigs plus the `infra` project reference, `biome.json` includes, `vitest` `include`, the bundlesize globs, `cdk.json`'s `app` path, README, ADRs 0001–0007 — would need touching for zero functional gain. The frontend stays the root package indefinitely; this is the seam ADR 0007 flagged ("the monorepo-seam note") and it's now resolved as: **workspace for the API, root stays the frontend**, not a symmetric package split.

> **Addendum (superseded):** this specific sub-decision — the frontend staying at the root instead of becoming its own workspace package — is reversed by `docs/adr/0011-apps-and-packages-workspace-restructure.md`. The cost/benefit calculus above was accurate for its time (one backend package, one spike route); it changed once `apps/ingestion` and `packages/shared` entered the plan and the `apps/`-for-deployables / `packages/`-for-shared-libraries convention was confirmed against real docs rather than assumed. Left as-written above rather than edited, so the original reasoning stays on record. The REST/OpenAPI-over-tRPC and Hono-over-Express/Fastify/NestJS decisions elsewhere in this ADR are untouched by that reversal.

## What was actually built

- `packages/api/package.json` — `hono` and `@hono/zod-openapi` pinned exactly (no `^`), same reasoning as the CDK pin in ADR 0007: a new, large-ish dependency surface with no `bun audit` allowlist mechanism shouldn't float.
- `packages/api/src/index.ts` — one `OpenAPIHono` app, one `createRoute()`-defined `GET /health`, and `/doc` for the generated spec.
- `packages/api/tsconfig.json`, referenced from the root `tsconfig.json` (`references`) — same reasoning as `infra/tsconfig.json`: otherwise `tsc -b --noEmit` silently skips it, repeating the exact decorative-declaration mistake the removed `.nvmrc`/`engines.node` turned out to be.
- Root `package.json` gained `"workspaces": ["packages/*"]`. Confirmed (not assumed) how Bun lays out a workspace install: dependencies are **not** hoisted to the root `node_modules` — each workspace package gets its own `node_modules/` with symlinks into a shared `node_modules/.bun` store. One `bun.lock` for the whole repo either way.
- `exactOptionalPropertyTypes` stays **on** for `packages/api` (unlike `infra/`, where it had to be scoped off against `aws-cdk-lib`'s own type gaps) — checked on the first route rather than assumed, and Hono/`@hono/zod-openapi`'s types satisfy it cleanly. **Superseded 2026-08-18 by ADR 0017**: the flag is now off project-wide, unrelated to Hono's types — this compatibility finding stays true, it's just no longer what determines the setting.

## Consequences / known gaps, deliberately not resolved here

- **No tests exist for `packages/api`, and no test runner is wired up for it.** Adding a Vitest config for zero test files would be scaffolding ahead of need — the same mistake `QueryClient.defaultOptions` would have been with zero real queries yet. When the first real route lands with real behavior worth testing, `packages/api` needs its own test setup (`node` environment, not the root's `jsdom`) — either a Vitest `projects` entry in the root config or its own standalone config. Noted here so it's a recorded gap, not a silent one.
- **Deploy runtime target (Lambda vs. Fargate/ECS) is explicitly deferred**, not decided. Routes are written as plain Hono handlers, which run identically under Bun locally, on Lambda (via `hono/aws-lambda`), or in a container — so this defers cleanly without blocking route-writing. Revisit once there's a confirmed AWS account and a real feature to deploy; don't let routes accumulate indefinitely without picking one; it's Hono's edge-runtime portability being spent as intended, not a permanent shrug.
- **This deferral has a second consequence, caught by adversarial review, not by this ADR originally**: the frontend's CSP (ADR 0007) can't allow-list this API's origin in `connect-src` until this decision lands, since the origin doesn't exist yet. `connect-src` is set to an explicit `'self'` placeholder in the meantime (see ADR 0007's consequences) — a recorded gap, not a silent one. Whoever resolves this deferral must also update that CSP line in the same change.
- **No first real feature/domain chosen yet.** `/health` is a plumbing spike, not a feature. The next backend work should pick a concrete domain — still open — rather than continuing to build infrastructure in the abstract.
- **CI does not yet run anything specific to `packages/api`.** `bun run lint`/`typecheck` already cover it (Biome's `**` include, the new tsconfig reference); `bun run build`/`test` deliberately do not attempt to build or test the API package, since it has no build step (Bun runs the TS directly) and no tests yet.

## Considered and rejected

- **tRPC** — see above; the monorepo fit was genuinely good, lost to REST's universality.
- **Express, Fastify** — see comparison table; both viable, lost to Hono's Bun-native fit and superior Zod/OpenAPI story for this specific stack.
- **NestJS** — architecturally aimed at a scale this project isn't at.
- **Hand-written OpenAPI spec first (with Prism as a mock server)** — legitimate API-design-first workflow, not needed without an external contract to hold steady against.
- **Symmetric monorepo restructure (`packages/console` + `packages/api`)** — large blast radius (see decisions above) for no functional gain right now; revisit if a second reason to move the frontend ever appears.
