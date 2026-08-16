# Router context rewiring + first loader-driven route

Prerequisite for every data-loading pattern in [`docs/design/frontend-architecture.md`](../design/frontend-architecture.md) §3. That document's own ⚠️ finding: `createRouter({ routeTree })` has no `context` and `QueryClientProvider` renders **inside** `__root`'s component, so a route loader cannot reach the query client at all. Loaders run before the route component tree renders.

## Files touched + why

- `apps/web/src/routes/__root.tsx` — `createRootRouteWithContext<{ queryClient: QueryClient }>()`; `RootComponent` drops `QueryClientProvider` and keeps `MantineProvider` + `Outlet` + devtools.
- `apps/web/src/main.tsx` — `createRouter({ routeTree, context: { queryClient } })`, with `QueryClientProvider` wrapping `RouterProvider` **outside** it.
- `apps/web/src/lib/query-client.ts` — a default `staleTime`. Query's default is `0`, which the design doc (§3, prerequisite 4) flags as actively wrong here.
- `apps/web/src/routes/-queries/competitions.ts` (new) — `competitionsQueryOptions`, hierarchical key `["competitions", "list"]`. The `-` prefix keeps it out of the route tree while importable, per the router's own documented colocation convention.
- `apps/web/src/routes/index.tsx` — `loader` calling `ensureQueryData`, plus `pendingComponent` and `errorComponent`.
- `apps/web/src/routes/-index-page.tsx` — `useQuery` → `useSuspenseQuery`; fetch logic moves to the query-options file.
- `apps/web/src/routes/-index-page.test.tsx` — reworked for suspense.
- `docs/design/frontend-architecture.md` — record the `defaultPreload` deviation below (living doc, so it gets corrected rather than contradicted).

## Approach

**Why the index route converts in the same change, rather than config alone.** The rewiring is invisible: it changes nothing observable unless something uses a loader. A config-only change would be unverifiable, which contradicts this project's verify-by-driving-it rule. Converting the one existing route both proves the wiring works and establishes the pattern every later screen copies.

**Provider position is the whole bug.** `QueryClientProvider` must sit outside `RouterProvider` — loaders run before the route component tree renders, so a provider inside `__root`'s component is not in scope for them, and `useSuspenseQuery` in the route component needs the same client the loader populated.

### Deviation from the design doc, deliberate

The design doc prescribes `defaultPreload: 'intent'` **and** `defaultPreloadStaleTime: 0`. **Both are deferred to the first change that adds a second route.**

With one route there is nothing to preload between, so neither has observable behaviour and neither can be verified. `defaultPreloadStaleTime` is moot when `defaultPreload` is `false` anyway. They also interact with the API's 100-request/15-minute rate limiter (§3 gotcha #10), which deserves real thought when there is a hover-dense list to test against. Enabling unverifiable configuration is exactly what this project's rules argue against. The design doc is updated to say "with the second route".

### Alternatives considered

- **Config-only rewiring, convert a route later** — rejected. Unverifiable, and the failure mode is silent: the app still renders correctly with the provider in the wrong place; only loaders break, and there are none to notice.
- **Include the root error boundary and `notFoundComponent`** — rejected for this change. They are error-surface concerns rather than data loading, and this change is already broad. Tracked separately.
- **Move to route-level tests entirely, dropping component tests** — rejected. Component tests are faster and cover the state matrix well; the route test exists to prove the loader path specifically.

## Test/type impact

The real cost of this change. `useSuspenseQuery` changes how the component tests work:

- **Loading** — suspense throws a promise, so the test needs a `<Suspense>` wrapper rather than asserting an inline `Loader`.
- **Error** (request failure and schema-invalid) — needs an `ErrorBoundary`. Per §3 gotcha #6, `useQueryErrorResetBoundary` must be wired or retry appears permanently broken.
- **Success and axe** — largely unchanged.

Plus **one route-level test** using `createMemoryHistory` with a per-test client passed via `context`. The research flagged this exact composition as `[UNVERIFIED]` — no official example wires a memory-history test router and a per-test `QueryClient` together — so this resolves a known unknown rather than assuming.

## Migration/breaking-change risk

Low and self-contained. No API, database, or infrastructure change.

The real risk is subtle: if the provider ends up positioned wrongly the app still renders and only loaders break, which is invisible until a loader exists. That is precisely why the route converts in the same change.

`exactOptionalPropertyTypes` plus `createRootRouteWithContext` generics is a plausible friction point — TS 7 strictest has not met this API in this repo yet.

## Rollback plan

Plain revert. Nothing external is touched.

## Verification

Not just the test suite:

1. Full pipeline — lint, typecheck, test, build, `bun audit`, **and `bun run e2e`** (the last of which was missed on the previous change; root `bun run test` does not include it).
2. Real browser against a real API: request succeeds, correct CORS header, no console errors.
3. Kill the API mid-session, confirm the error state still renders — the same check the previous change was verified with, re-run to prove the conversion did not regress it.
