# Players: in-table loading state instead of full-page reload

## Context

`PlayersList` used `useSuspenseQuery`. Any sort/filter/pagination change produces a
new query key, `useSuspenseQuery` throws, and the nearest Suspense boundary — the
route's `pendingComponent` — replaces the _entire page_ with a generic "Loading
players..." spinner, discarding the already-visible table.

## Root cause (two independent mechanisms, both had to be fixed)

1. `useSuspenseQuery`'s throw-on-new-key behavior fires the Suspense fallback
   **immediately** on every param change — this is the visible symptom.
2. Independently, the route's `loaderDeps` (`page`/`pageSize`/`search`/`position` —
   `sort`/`sortDirection` were missing, a real pre-existing bug) makes every param
   change create a new TanStack Router match, re-running `loader`'s
   `ensureQueryData`. If that fetch exceeds `pendingMs` (default 1000ms), the
   router's _own_ pending fallback fires too — a second, independent full-page-reload
   path that fixing only #1 would have left live for slow requests.

Confirmed via TanStack Router's own source (`load-matches.ts`, `Match.tsx`) pulled
through Context7, not assumed: match identity is `route.id + loaderDepsHash`, and a
Suspense throw only happens when `match.status === 'pending'` for a match the
component is actually reading from — i.e. tied to match identity, not directly to
`useSuspenseQuery`. The two mechanisms compound: even after switching off Suspense,
a slow request on a changed `loaderDeps` hash still risks the router-level pending
fallback.

## Design

- **`loaderDeps` dropped entirely** on `/players`. With no `loaderDeps` (or a
  constant), `loaderDepsHash` never changes, so the match is not re-created by
  search-param changes — the loader only runs once per genuine route _entry_
  (mount / hard navigation), never mid-mount. All sort/filter/page reactivity moves
  entirely into the mounted component's own query.
- Loader still needs the _actual_ current search on that one entry (deep-linking,
  e.g. `/players?page=3&sort=name` typed directly) — reads it off `location.search`
  in the loader's argument, then re-validates with `PlayersSearchSchema.parse(...)`
  rather than trusting whatever shape/validation-state `location.search` carries.
  TanStack's docs don't pin this down precisely enough to risk a query-key mismatch
  with the component's own `routeApi.useSearch()` (which is always the validated,
  `.catch()`-defaulted object) — a mismatch here would silently double-fetch (loader
  warms one key, component reads a different one, cache miss, second request),
  breaking the existing `toHaveBeenCalledTimes(1)` test. One `.parse()` call closes
  that risk outright instead of gambling on it.
- `PlayersList`: `useSuspenseQuery` → `useQuery` + `placeholderData: keepPreviousData`
  (TanStack Query v5's replacement for the old `keepPreviousData: true` option; not
  supported on `useSuspenseQuery` at all, which is _why_ the Suspense hook has to go).
  Previous rows + meta stay mounted and visible while a new page/sort/filter fetch is
  in flight; `isFetching` becomes the loading signal instead of a thrown promise.
- `useQuery`'s `data` is typed `T | undefined` (no Suspense guarantee). Add
  `if (playersResponse === undefined) return <GenericPending title="Players" />` —
  genuinely reachable (SPA navigation into a search-param combination the loader
  never warmed for this key), not a dead defensive check, so it's called out rather
  than silently added.
- `DataTable` gets a new optional `isFetching?: boolean` prop, merged into MRT's
  `state.showProgressBars` (not `isLoading` — that hides rows/shows skeletons,
  wrong for keepPreviousData; `showProgressBars` is the non-blocking thin bar).
  Renders via the already-patched `MRT_ProgressBar` in the **bottom** toolbar
  (`enableBottomToolbar` stays default-true for pagination; `enableTopToolbar={false}`
  doesn't suppress it — verified against `MRT_TablePaper.tsx` source, they're
  independent gates).
- Route's `pendingComponent`/`errorComponent` are untouched — still correct for a
  genuine first-ever navigation into `/players` (no cache) and for loader failures.

## Known accepted tradeoff

During a `keepPreviousData` refetch, `DataTable`'s pageIndex-clamp
(`Math.min(pageIndex, meta.totalPages - 1)`) reads the _previous_ response's
`meta.totalPages`, since `meta` itself is the placeholder data until the new
response lands. Self-corrects on arrival; not fixed preemptively — no observed
symptom, would be speculative.

## Files touched

- `apps/web/src/routes/players/index.tsx` — drop `loaderDeps`; `loader` re-validates
  `location.search` via `PlayersSearchSchema.parse`.
- `apps/web/src/components/pages/players/PlayersList.tsx` — `useQuery` +
  `placeholderData: keepPreviousData`; `isFetching` passed to `DataTable`; guard for
  `data === undefined`.
- `apps/web/src/components/common/DataTable.tsx` — `isFetching?: boolean` prop →
  `state.showProgressBars`.
- `apps/web/src/routes/players/-index.test.tsx` — existing 8 tests must stay green
  (esp. the single-fetch loader-warm-cache assertion); add a test asserting previous
  rows stay mounted (no full-page pending swap) across a pagination/sort change.

## Test/type impact

`location`'s TanStack type isn't narrowed to this route's schema — resolved by the
explicit `.parse()` call itself (produces `PlayersSearchParams`), not a cast.

## Migration/breaking-change risk

Medium — this is the app's only loader/query architecture; wrong here means
double-fetching or first-load flicker. Mitigated by keeping the full existing test
suite green plus live-browser network-tab verification (one request per
interaction, progress bar visible, rows never disappear, hard-refresh with
`?page=3&sort=name` still correct) before calling this done.

## Rollback

Single diff across 3 source files + 1 test file — revertable as one unit.

## Follow-up (same session): a real bug found during live verification, and a design decision against the canonical TanStack pattern

**Bug found:** deep-linking to `/players?page=3&sort=name&sortDirection=asc` loaded
page 3 correctly, then silently reset the URL back to `page=1` a moment later.
Root-caused via temporary `console.log`s in each `useServerDataTable` handler:
`onColumnFiltersChange` fires **twice** on mount — MRT's filter-input UI syncing its
own internal state (visible column filters via `initialState={{ showColumnFilters:
true }}`, two filterable columns) — with values that already match `search`. The
handler unconditionally set `page: 1` on every call regardless of whether the
resolved filter values actually changed, so this no-op mount-time call silently
clobbered the deep-linked page. **Pre-existing bug**, unrelated to the loader change
above — just never exposed before because no earlier test deep-linked to a
mid-range page. Fixed in `useServerDataTable.ts`'s `onColumnFiltersChange`: compute
the next filter entries first, compare each against the current `search` value, and
return early (no `setSearch` call at all) if nothing actually changed.

**Design decision, surfaced by the user linking [TkDodo's "Reliable Query
Prefetching with TanStack Router"](https://tkdodo.eu/blog/reliable-query-prefetching-with-tanstack-router)
(published the day this was built):** that post argues for the _opposite_ of this
plan's `loaderDeps` removal — keep `loaderDeps` declaring every param the loader
depends on, and prevent loader/component query-key drift by sharing one
`queryOptions` source (route `context()`) between `ensureQueryData` and the
component's query, rather than letting the loader and component compute params
independently. Considered switching to that pattern; **kept this plan's design**
instead, for a reason specific to this route's actual goal: with `loaderDeps`
declared, _every_ param change re-creates the router match and re-runs
`ensureQueryData`, and if that fetch ever exceeds `pendingMs` (1000ms default), the
router's own pending fallback still replaces the full page — reintroducing exactly
the bug this task exists to fix, just latent until the API is slow instead of never.
Dropping `loaderDeps` removes that risk unconditionally, regardless of API latency.
The drift risk TkDodo describes is mitigated here without route context: both the
loader (`PlayersSearchSchema.parse(location.search)`) and the component
(`routeApi.useSearch()`, which runs the same `validateSearch` schema internally) are
already forced through the same `PlayersSearchSchema` before either one builds a
query key via `playersListQueryOptions` — one schema, one query-options factory,
consumed twice, same effect as the article's shared-context approach without adding
route context for a single-route app.

**Loading-indicator design decision (user asked "skeletons?"):** kept
`showProgressBars` only (thin bar, rows stay visible) over MRT's `showSkeletons`
(replaces row content). Skeletons only make sense with no data to show, and
`DataTable` never renders with zero data — first load is the route's
`GenericPending` full-page state; every other render has either real or
`keepPreviousData`-placeholder data. Skeletons during a param-change refetch would
hide the very rows `keepPreviousData` is preserving. Confirmed by asking; user chose
progress-bar-only.

**Final live-browser verification (fresh tab, network tab open):**

- Sort change (`Date of birth` header click): exactly 1 request, rows updated
  in place, no full-page swap.
- Deep-linked hard load of `/players?page=3&sort=name&sortDirection=asc`: exactly 1
  request, page stays at 3 (bug above, now fixed).
- Production `vite preview` build: hit the pre-existing, already-documented CSP
  `connect-src` placeholder issue (`README.md` known quirks) — inconclusive for this
  verification, not a regression from this change.
