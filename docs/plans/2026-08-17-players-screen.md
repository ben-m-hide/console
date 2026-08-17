# Players screen — `/players`

Build-order step 1's frontend half ([`docs/design/frontend-ui-ux.md`](../design/frontend-ui-ux.md) §1/§3.2). The API landed 2026-08-16 (`GET /api/v1/players`); this is the first real screen built on the router-context rewiring (`docs/plans/2026-08-15-router-query-context.md`), so it establishes the loader/`queryOptions`/`useSuspenseQuery` pattern every later screen copies.

## Scope decision (approved 2026-08-17)

Ship `/players` **standalone**, no `AppShell`/nav/scope-selector. The design doc's §2.1 header scope selector is deferred: the API doesn't accept a competition filter on `/players` at all today (only `search`/`position`), and `AppShell` carries its own real accessibility surface (skip link, focus management on route change, live regions — §5.3) that deserves its own plan, not a side effect of one screen. `/players` is reachable directly by URL for now.

## Files touched + why

- `apps/web/src/routes/-queries/players.ts` (new) — `playersQueryOptions(params)` factory, mirrors `-queries/competitions.ts`.
- `apps/web/src/routes/players.tsx` (new route file) — `validateSearch`, `loaderDeps`, `loader`, `pendingComponent`, `errorComponent`.
- `apps/web/src/routes/-players-page.tsx` (new) — the page component, `useSuspenseQuery` + `Route.useSearch()`/`Route.useNavigate()`.
- `apps/web/src/routes/-players-page-states.tsx` (new) — pending/error components, same split as `-index-page-states.tsx`.
- `apps/web/src/routes/-players-page.test.tsx`, `-players-route.test.tsx` (new) — component test (stubbed `fetch`, all states) and route test (real route tree, real loader), same two-file split as the index screen.
- `apps/web/src/main.tsx` — no change expected; confirming the existing router context is sufficient.
- `docs/design/frontend-ui-ux.md` — mark step 1 fully closed once the screen ships (currently: API done, screen "still to build").

## Approach

**Search params are the source of truth**, per §2.1/§3.2: `page`, `pageSize`, `search`, `position`, all optional, `.catch()` to a safe default rather than throwing on a malformed URL (architecture doc gotcha #8). `page`/`pageSize` go in `loaderDeps`; `search`/`position` do too, since the API needs them server-side.

**Uniform `useSuspenseQuery`, not `useQuery` + `keepPreviousData`** — this is the exact case architecture doc gotcha #1 was written for. `page` is in `loaderDeps`, so the loader resolves before the component re-renders and `keepPreviousData` never has anything to bridge; the router's own `pendingMs` (default 1000ms) delivers the "don't blank on a fast page change" UX instead. Deviating from this would repeat the mistake gotcha #1 documents as already caught once.

**Debounced search input.** A `TextInput` bound to local state, `useEffect`-syncing into the URL search param after a short debounce (matches the pattern in TanStack Router's own `dashboard.users` example — draft state locally, sync to the URL, not the other way round) — typing shouldn't fire a network request and a loader transition per keystroke.

**Pagination via Mantine's `Pagination`**, `total` set from `meta.totalPages` (a page count, not a row count — verified from Mantine's docs, this is an easy mismatch). Position filter as a `Select` sourced from a fixed list — the API's `position` param is an exact match, and there's no positions-list endpoint to derive options from; hardcode the known Sportmonks position strings, revisit if that list turns out incomplete.

**States**, per §6: loading (route `pendingComponent`, matches the index page's `aria-label`d `Loader` pattern), error (route `errorComponent`, same retry-via-`router.invalidate()` + `useQueryErrorResetBoundary` pattern as `-index-page-states.tsx`), empty (Mantine's real `EmptyState` component — confirmed to exist in the installed Mantine 9, `title`/`description`/`icon`), success. Not-found is **not applicable** — `/players` takes no ID param.

**Sortable/selectable table is out of scope for this plan.** The design doc calls both out as "ours to build," and neither has a consumer yet (no sort param on the API; multi-select's consumer is Compare, not yet built). Ship a plain, name-ordered table matching the API's fixed default order. Selection/multi-select-into-Compare is a follow-up once Compare exists to feed.

### Alternatives considered

- **`useQuery` + `keepPreviousData`** — rejected, this is gotcha #1's documented trap.
- **Client-side debounce via a library (`use-debounce` or similar)** — rejected, a `useEffect` + `setTimeout` is a handful of lines and this project has no existing debounce utility to reuse (checked — `docs/conventions/typescript.md`'s "check for an existing util first" rule).
- **Build the header scope selector now, scoped to just `search`/`position`** — rejected as a false economy; a "scope selector" with no scope to select (no competition param exists server-side) is a component with no real job.

## Test/type impact

- New `playersQueryOptions` tests are unnecessary — it's a thin wrapper, same as `competitionsQueryOptions` has none; the fetch/parse logic is exercised via the component and route tests instead.
- Component test: loading (suspense fallback), success (rows render), error (request failure + schema-invalid, same two cases as the index page), empty (API returns `data: []`), debounced search firing after the delay not before, axe check.
- Route test: real loader run against a stubbed `fetch`, confirms exactly one request fires (loader warms the cache, no duplicate on mount — same assertion style as `-index-route.test.tsx`), and that a `page=2` navigation re-runs the loader with the right `loaderDeps`.
- `packages/shared`'s generated `PlayerSchema` reused for response validation — no new schema needed for individual rows; the paginated envelope (`{ data, meta }`) needs its own Zod shape client-side, tier 1 ("inline in the file that uses it") per `docs/conventions/typescript.md`, mirroring how the API route itself defines it.

## Migration/breaking-change risk

Low. New route, no existing route touched except confirming (not changing) router context wiring. Plain revert.

## Rollback plan

Delete the new route/query/test files; nothing else references them yet.

## Verification

1. Full pipeline — lint, typecheck, test, build, `bun audit`, `bun run e2e`.
2. Real browser against the real API: default page renders real players; typing in search debounces and updates results; position filter narrows results; pagination moves pages without a full-page flash (confirms `pendingMs` behaviour empirically, which the architecture doc flagged as `[UNVERIFIED]`); a malformed `?page=` in the URL degrades to page 1 rather than erroring; killing the API produces the error state with working retry (same check as the index page).
3. Network tab: confirm one request per loader-driven navigation, not one from the loader and a second from the component.

## Open item this surfaces

**`[UNVERIFIED]` from the architecture doc gets resolved here**: whether `pendingMs`'s "hold the previous page" behaviour is real, not just the natural reading of the docs. Record the outcome in `docs/design/frontend-architecture.md` §3 gotcha #1 once observed, either confirming it or correcting the doc if it doesn't hold.
