# Wire apps/web to apps/api — first real browser → API request

## Files touched + why

- `apps/web/package.json` — add `@console-next/shared: "workspace:*"`, matching `apps/api`'s declaration style. Gives the frontend `CompetitionSchema` for runtime validation of the response, rather than re-declaring the shape or trusting it blindly.
- `apps/web/.env.example` (new) — `VITE_API_URL`. First env var this package has ever needed. Defaults to `http://localhost:4100`, the port `apps/api`'s `run-api` skill and its `smoke.sh` actually serve on. **Explicitly not `3000`** (Bun/Hono's bare default): that skill documents a real, observed failure where another process held `[::1]:3000` and `curl` silently received _someone else's_ response with no bind error — a wrong-but-plausible answer, which is the worst possible failure mode for a task whose entire purpose is verifying a real request path.
- `package.json` (root) — change `build` from `bun run --filter ./apps/web build` to `bun run codegen && bun run --filter ./apps/web build`, mirroring what root `typecheck` already does. Required by this change: `apps/web`'s own `codegen` is only `tsr generate` (its route tree), while `packages/shared`'s `*.gen.ts` schemas are generated **and gitignored**. Once `apps/web` imports `@console-next/shared`, a clean checkout's `bun run build` would fail on missing generated schemas — the identical trap already documented in `.claude/CLAUDE.md` for `routeTree.gen.ts`.
- `TODO.md` — close `:64` (the `createQueryClient()` factory item, bundled in here) and note partial progress on `:45` (the frontend↔API seam now genuinely exercised).
- `PROJECT.md` — Phase 6's first frontend checkbox reflects the first real API-backed screen.
- `apps/web/src/lib/query-client.ts` — add a `createQueryClient()` factory alongside the existing module-level singleton (`__root.tsx` keeps using the singleton; tests construct their own).
- `apps/web/src/routes/-index-page.tsx` — replace the "It works" placeholder button with a real `useQuery` against `GET /api/v1/competitions`, response parsed via `CompetitionSchema.array().safeParse`, rendering explicit loading / error / schema-invalid / success states.
- `apps/web/src/routes/-index-page.test.tsx` — drop the placeholder-button assertion, add loading/error/success coverage with a stubbed `fetch`, wrapped in `QueryClientProvider` (via the new factory) + `MantineProvider`. Keep the existing axe accessibility check.

## Approach

**Inline the fetch in the component — no `apiClient` wrapper, no data-fetching module.** One consumer, one read endpoint. `.claude/CLAUDE.md` already records that no client abstraction exists because none has been needed, and the promotion rule is "once a second consumer actually needs it." A generic CRUD/related-data/suspense-infinite-loading module was explicitly considered and deferred in the session that approved this plan: `apps/api` has zero create/update/delete routes today, so that module would be designed against endpoints and screens that don't exist. It is sequenced **after** the frontend UI/UX design session, so its shape is driven by real screen requirements rather than guesses.

**Absolute `VITE_API_URL` origin, not a Vite dev proxy.** A proxy would make every dev request same-origin and therefore silently bypass the CORS configuration that `apps/api/src/index.ts:35-38` already implements — defeating the main purpose of this task, which is to actually exercise the untested frontend↔API seam (`TODO.md:45`).

**No API-side changes needed.** Research confirmed CORS is already wired and already defaults to `http://localhost:5173` (Vite's default port). The CDK `connect-src 'self'` placeholder (`infra/lib/hosting-stack.ts:46`) governs deployed CloudFront response headers only — it has no effect on the Vite dev server, so it correctly stays deferred until the Render deploy per `TODO.md:57`.

**Bundled in: the `createQueryClient()` factory** (currently `TODO.md:64`, backlog). Its own stated trigger — "hypothetical until a component actually calls `useQuery`" — fires exactly here: this is the first component to do so, and the tests need an isolated client per test. Small, directly motivated, not speculative. The factory must accept a retry override: TanStack Query v5 retries failed queries 3× with backoff by default, which would make the error-state test hang rather than fail cleanly, so tests construct a client with `retry: false`.

**Browser-bundle safety of the new dependency — verified, not assumed.** `packages/shared`'s barrel (`src/index.ts` → `schemas/index.ts` → `*.gen.ts`) transitively imports **only `zod`**; `@console-next/db` and `drizzle-orm` are `devDependencies` there, used solely by the codegen script, so neither can reach the client bundle. `apps/api` imports the same package with no `tsconfig` `references` entry (plain `node_modules` resolution), so `apps/web` needs no tsconfig change either. Bundle headroom measured before starting: entry chunk is **100.5 / 150 kB gzip**, so `zod` (first time it actually enters the client bundle — declared in `apps/web` deps but previously unimported) has room. Re-check after the change; if `vite-plugin-bundlesize`'s limit trips, that is a real decision (raise the limit vs. drop client-side `safeParse`), not something to paper over.

### Alternatives considered

- **Wire `/players/compare` instead of `/competitions`** — rejected. It needs real player IDs as query params and percentile-rendering UI; `/competitions` is a parameterless list, the smallest thing that still genuinely proves the seam.
- **Add MSW for test network mocking** — rejected. A new dependency for one endpoint; `vi.stubGlobal("fetch", ...)` covers it. Revisit if the UI/UX work produces many endpoints worth a shared mock layer.
- **Skip client-side `safeParse`, trust the typed response** — rejected. Zod/DB schema drift is one of the three specific risks `TODO.md:45` names; validating at the JSON trust boundary is exactly what `packages/shared` exists for, and CLAUDE.md lists trust-boundary validation as never on the chopping block.

## Test/type impact

- Existing `-index-page.test.tsx` placeholder-button assertion is removed — intentional, the button it targets no longer exists.
- New tests: loading state, error state (rejected fetch), success state (rendered competition list). `fetch` stubbed via `vi.stubGlobal`, no new dependency.
- The axe accessibility check is retained, run against the resolved success state (`color-contrast` still disabled — jsdom has no layout engine, see README Known quirks).
- Root `bun install` required for the new workspace dependency (Bun doesn't hoist — see README Known quirks).
- `codegen`/`routeTree.gen.ts` unaffected; no new route files.

## Migration/breaking-change risk

Low. No API contract change, no DB/schema change, no infra change. Additive except for removing the placeholder button, which nothing depends on.

## Rollback plan

Plain revert. No database, deployment, or external-service state involved.

## Risks / edge cases surfaced

- **Loading and error states are required, not optional** — `useQuery`'s `isPending`/`isError` must both render something real. A component that only handles the happy path would pass a mocked test while failing the moment the API is down, which is the exact class of failure this task exists to catch.
- **Schema-drift must fail loudly** — a `safeParse` failure needs a visible error state, not a silent crash or a blank list.
- **`/api/v1/competitions` is rate-limited** (100 req/15min, keyed on `x-forwarded-for`). Browser requests don't set that header, so all local dev requests share one bucket. Fine for normal use; a re-render loop or a hammering script could trip it. Envelope: `{"error":{"code":429,"message":"Too many requests"}}`.
- **Runtime verification is mandatory here, not optional** — the whole point is the real seam. Both servers must run together and the request must be confirmed in a real browser (`run-api` + `run-console` skills), not merely asserted against a stubbed `fetch` in jsdom.

## Unresolved questions (resolved at approval)

1. Replace the "It works" placeholder button? → **Yes**, it is a placeholder and now redundant.
2. Bundle `createQueryClient()` (`TODO.md:64`) into this task? → **Yes**, its stated trigger fires here.
3. `VITE_API_URL` default? → **`http://localhost:4100`**, the port `run-api`/`smoke.sh` actually serve. Corrected before implementation: an earlier draft said `3000`, which contradicted the very gotcha it cited (see Files touched). The same value is used as the in-code fallback, since `.env.example` is a template — no `.env` will exist on first run, so the fallback is what actually resolves.
