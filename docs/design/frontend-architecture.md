# Frontend architecture design — `apps/web`

How the code is organised, where logic lives, and how data reaches a screen. Sibling to [`frontend-ui-ux.md`](./frontend-ui-ux.md), which **owns the feature decomposition** — the seven screens and their build order are defined there and referenced here, never restated.

Two constraints from the root `CLAUDE.md` are in genuine tension throughout this document, and the resolution is stated once here rather than re-argued per section:

> **"Simplicity first"** / YAGNI / "default answer is no" **vs.** **"genuine, transferable, current industry-standard practice"**.

**Resolution:** research establishes the full standard; each recommendation is then marked **adopt now** (a real current need justifies it) or **deferred with a named trigger**. A deferred item is not a rejected one — it has a written condition that makes it worth adopting. This keeps the doc rigorous without building speculative structure.

---

## 1. The finding that shapes everything below

**TanStack Router documents no application structure beyond the route tree.** Its file-naming conventions cover `src/routes/` only; the rest of `src/` is undefined by the framework.

Verified by listing the actual `src/` of the router's own examples via the GitHub API (2026-08-15, `TanStack/router`):

| Example                               | `src/` contents                                         |
| ------------------------------------- | ------------------------------------------------------- |
| `kitchen-sink-file-based`             | `components/ hooks/ routes/ utils/`                     |
| `kitchen-sink-react-query-file-based` | `components/ hooks/ routes/ utils/`                     |
| `start-basic-react-query`             | `components/ routes/ styles/ utils/`                    |
| `start-trellaux`                      | `components/ hooks/ routes/ utils/ queries.ts types.ts` |
| `start-large`, `large-file-based`     | `routes/` only                                          |

**Not one official example ships a `features/` directory.** Every one with app code uses a layer-based layout alongside `routes/`.

So `features/` is a **community overlay** — influential (bulletproof-react, 35.7k★), but not the router's position. Feature-Sliced Design is real and actively maintained (2.3k★) but ~15× smaller and absent from every framework's examples. React itself has never had an opinion; its legacy FAQ says "don't spend more than five minutes on choosing a file structure" and recommends colocation.

**The honest framing for any ADR: this is a convention question with no official answer.** Anyone calling `features/` "the standard" is generalising from React _without_ file-based routing.

**The one thing the router does officially bless is route-folder colocation** via the `-` prefix — files excluded from the route tree but still importable, explicitly documented as "used to colocate logic in route folders". `apps/web` already does exactly this (`players/-players.test.tsx`) for route-scoped tests. Query options factories moved out to `src/queries/` (below) once they stopped being route-scoped — a generic `list()`/`listQueryOptions()` shared across entities isn't "logic that belongs to one route folder" anymore. **The project is still on the documented path for what actually is route-scoped.**

---

## 2. Structure

### Adopt now

Two rules, not one. **Shared code** — genuine cross-route utilities/hooks/UI atoms — still promotes on the **second consumer**, per the existing rule in root `CLAUDE.md`. **A route's own page component does not wait for a second consumer** — it splits into `src/components/pages/<feature>/` immediately, so the route file stays thin (loader/`component`/`pendingComponent`/`errorComponent` wiring only) and the page component is unit-testable without the router. This is what `players/` and `competitions/` (formerly `-players-page.tsx`/`-index-page.tsx`) actually did; the trigger for #9 in the summary table below was superseded by this rule rather than firing on consumer count.

Route folders use **folder + `index.tsx`**, not flat dot-notation — `routes/players/index.tsx`, not `routes/players.index.tsx`. Both are TanStack Router–valid; folder form was chosen so route-scoped colocated files (`-players.test.tsx`) sit next to the route they belong to instead of accumulating flat in `routes/`.

```
src/
├── routes/                     # file-based route tree
│   ├── __root.tsx
│   ├── index.tsx                    # Dashboard — wires CompetitionsList to the route
│   ├── players/
│   │   ├── index.tsx                # thin: wires PlayersList to the route
│   │   └── -index.test.tsx          # colocated, route-level test
│   └── -index.test.tsx
├── queries/                    # generic listQueryOptions()/retrieveQueryOptions(), one folder per entity
│   ├── common/
│   │   └── query-options.ts         # queryOptions() factories, wrapping lib/api's list()/retrieve()
│   ├── competitions/
│   │   └── competitions.ts
│   └── players/
│       └── players.ts
├── routing/                    # shared search/pagination schemas (routes' validateSearch — no loaderDeps, see gotcha #1)
│   ├── search.ts                    # ListSearchSchema, ListMetaSchema
│   └── player.ts                    # PlayersSearchSchema (extends search.ts)
├── types/                      # domain-level types not tied to one route
│   └── enums.ts                     # PlayerPosition (ADR 0018)
├── hooks/                      # cross-file (not yet cross-entity) shared hooks
│   └── DataTable/
│       └── useServerDataTable.ts    # MRT state <-> URL search-param sync
├── components/
│   ├── pages/                  # one folder per route's page component
│   │   ├── competitions/
│   │   │   ├── CompetitionsList.tsx
│   │   │   └── CompetitionsList.test.tsx
│   │   └── players/
│   │       ├── PlayersList.tsx
│   │       └── PlayersList.test.tsx
│   └── common/                 # genuinely shared, second-consumer-gated
│       ├── DevTools.tsx
│       ├── GenericPending.tsx       # loading state, parameterized by title
│       ├── GenericError.tsx         # error state, parameterized by title
│       └── DataTable/
│           └── DataTable.tsx        # mantine-react-table wrapper, server-driven pagination/sort/filter
├── config/                     # environment.ts (MODE-based isDev())
├── lib/                        # api/ (client, resource.ts, types/), query-client.ts, theme.ts
└── main.tsx
```

`GenericPending`/`GenericError` (superseding the earlier per-screen `-index-page-states.tsx`/`-players-page-states.tsx`) moved shared UI states out of `routes/-queries/` once a second entity made the duplication real and identical across screens. The generic fetch+validate pair (`list()`/`retrieve()`) lives in `lib/api/resource.ts`, not `queries/common/` — see `docs/adr/0016-wretch-for-api-client.md`'s 2026-08-19 correction for why: they were moved into `lib/api/` on 2026-08-19 once `retrieve()` (single-entity-by-ID, for the upcoming Player detail screen) needed the exact same fetch-then-`safeParse` logic as `list()`, and co-locating beat duplicating a `safeParse` call at every `queries/` call site. `lib/api/` is no longer pure-transport-only as a result — `api-client.ts`'s `get()` still hands back an unvalidated body, but `resource.ts` validates on top of it before `queries/common/query-options.ts`'s `listQueryOptions()`/`retrieveQueryOptions()` ever see the result.

`src/hooks/` appears **when a second consumer needs it** — matching what every official example does, rather than pre-creating an empty directory. First real instance landed 2026-08-19: `src/hooks/DataTable/useServerDataTable.ts`, shared between `DataTable`'s pagination/sorting/filter-change handlers and the players route's URL search-param sync — not yet a second entity's consumer, but already a second _consumer_ within the one entity (the hook and `DataTable.tsx` itself both need it).

### Deferred, with triggers

| Structure                   | Trigger to adopt                                                                                                                                                                                                                                                                                 |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `src/features/<domain>/`    | 3+ routes clustering on one domain entity, each with own queries and non-trivial components. Introduce **for that one domain only** — do not retrofit everything.                                                                                                                                |
| Import-boundary enforcement | With `features/`. Feasible on Biome 2.5.7 by composing `noRestrictedImports` (gitignore-style path patterns) with per-glob `overrides` — **schema-verified, not empirically run**. Write a deliberately-violating import and confirm Biome errors before any ADR claims boundaries are enforced. |
| Barrel `index.ts`           | With `features/`, at a boundary that has a public API worth protecting. **Boundary barrels only, never aggregator barrels**, and never self-import through your own barrel.                                                                                                                      |
| Feature-Sliced Design       | **No.** FSD's own docs scope it to large apps with team churn. One developer, seven screens.                                                                                                                                                                                                     |

Given the full seven-screen scope, `features/` is a **likely** eventual outcome — the players branch alone is three routes on one entity. It is still not created before that materialises.

---

## 3. Data loading

### The officially documented relationship: Router **coordinates**, Query **stores**

Not loader _or_ Query — both. The loader triggers and awaits the fetch; Query owns the cache and the subscription. The router's own docs are emphatic about why the loader must be involved: "No 'flash of loading' states / No waterfall data fetching, caused by component based fetching".

### ✅ Fixed 2026-08-16 — the app could not do this at all

**This section originally described a blocker; it is now a record of how it was resolved**, since a design doc explains the current shape rather than only the plan for it. `createRouter({ routeTree })` had **no `context`**, and `QueryClientProvider` rendered **inside** `__root`'s component. Loaders run before the route component tree renders, so a loader had no way to reach the query client as the app was originally wired.

This never made the shipped index screen wrong — plain `useQuery` worked, and was verified working in a browser, before this fix landed. The rewiring (`docs/plans/2026-08-15-router-query-context.md`) was a prerequisite for everything else in this section:

1. `createRootRouteWithContext<{ queryClient: QueryClient }>()` in `__root.tsx` — done; `RootComponent` drops `QueryClientProvider`, keeps `MantineProvider` + `Outlet` + devtools.
2. `main.tsx` — `createRouter({ routeTree, context: { queryClient } })`, with `QueryClientProvider` wrapping `RouterProvider` **outside** it — done. `defaultPreload: 'intent'` and `defaultPreloadStaleTime: 0` remain **deliberately unset** — with one route there is nothing to preload between, so neither has observable behaviour to verify, and `defaultPreloadStaleTime` is moot while `defaultPreload` is `false`. Enable them once a hover-dense list exists (the Players screen) so the interaction with the rate limiter (gotcha #10) can be tested for real.
3. `createQueryClient(config?)` factory — done, it is what tests use.
4. **Default `staleTime` in that factory** — done, 5 minutes. `defaultPreloadStaleTime: 0` deliberately makes Query the single source of freshness truth — but Query's own default `staleTime` is **0**, so leaving it unset would mean every hover over a `<Link>` fires a real request once preloading is enabled. That is acutely wrong here: the players table is hover-dense, the API rate-limits at 100 req/15 min (gotcha #10), and `PROJECT.md` §4 establishes these reads are "highly cacheable" because data only changes when the ingestion job runs every few hours.
5. **Root error boundary and a `notFoundComponent`** — **still open**, deliberately split out of the rewiring rather than bundled in. Per-route `errorComponent` does not catch a render error in the shell itself, and three planned routes take an ID param. CloudFront rewrites 403/404 to `/index.html` at HTTP 200 (ADR 0007), so a deep link to a nonexistent ID lands in the app — `notFound()` + `notFoundComponent` is what turns that into an honest message instead of a crash or an empty list. Note `NotFoundRoute` is deprecated.

### Per-route pattern

```tsx
// queries/players/players.ts — generic listQueryOptions() over lib/api/resource.ts's list()

// routes/players/index.tsx — as actually shipped 2026-08-19; no loaderDeps, see gotcha #1
export const Route = createFileRoute("/players/")({
  validateSearch: PlayersSearchSchema,
  loader: ({ context: { queryClient }, location }) =>
    queryClient.ensureQueryData(
      playersListQueryOptions(PlayersSearchSchema.parse(location.search)),
    ),
  component: PlayersList,
  pendingComponent: () => <GenericPending title="Players" />,
  errorComponent: ({ error }) => <GenericError error={error} title="Players" />,
});

// components/pages/players/PlayersList.tsx — component owns reactivity independently
const search = routeApi.useSearch();
const { data: playersResponse, isFetching } = useQuery({
  ...playersListQueryOptions(search),
  placeholderData: keepPreviousData,
});
```

**Adopt now: `queryOptions()` factories**, built on `src/queries/common/query-options.ts`'s generic `listQueryOptions()`, one file per entity under `src/queries/<entity>/`. Highest value-to-cost item available — it is the single definition shared between a loader and a component, and it is already justified at one query. **Correction 2026-08-18**: the original plan here was hierarchical, human-chosen keys (`["players", "list", filters]` / `["players", "detail", id]`); the generic factory that shipped instead derives `queryKey` from the request itself (`[path, pathParams, queryParams]`). Callers pass a bare resource path (`"players"`, not `"/api/v1/players"` — `lib/api`'s `getPathWithPrefix` adds the version prefix), so `queryKey[0]` is still the plain entity name and `invalidateQueries({ queryKey: ["players"] })` matches every `players` query regardless of filters — prefix invalidation works. What it still can't do is express a key shaped differently from the request, e.g. gotcha #9's `["players", "compare", { ids, season }]` for `/players/compare`, which isn't a `path`/`pathParams`/`queryParams` shape at all. Revisit if that need becomes real.

| Screen                | Pattern                                                                                       |
| --------------------- | --------------------------------------------------------------------------------------------- |
| Dashboard             | loader + `ensureQueryData` for the summary; unawaited `prefetchQuery` for leaders             |
| Players (paginated)   | No `loaderDeps`; component-owned `useQuery` + `keepPreviousData` — see gotcha #1's correction |
| Player detail         | loader + `useSuspenseQuery`                                                                   |
| Compare               | search params as source of truth; **one** query over the whole id list — see gotcha #9        |
| Competitions / detail | loader awaits the competition; unawaited `prefetchQuery` for fixtures                         |
| Match report          | loader awaits the header only; prefetch the rest unawaited                                    |

### Gotchas that must not be discovered during implementation

1. **The paginated-list trap is the reasoning about it, not the pattern.** The tempting chain — "Query says use `placeholderData: keepPreviousData`; `useSuspenseQuery` doesn't have it; therefore don't use suspense on the players list" — **is wrong, and an earlier draft of this document fell for it.** Trace what actually happens with `loaderDeps: ({ search }) => ({ page })` when the user clicks page 2: the loader key changes, the loader `await`s `ensureQueryData({ page: 2 })`, and **the component does not re-render with the new page until that resolves** — so page 2 is already warm by first render. The query key never changes while the component is mounted and rendering, meaning `keepPreviousData` has nothing to bridge and never engages. **Swapping `useSuspenseQuery` → `useQuery` changes nothing.** Any blank comes from the Router's pending state, not from Query.

   What actually governs the UX is **`pendingMs` (default 1000 ms)** — the `pendingComponent` renders only for loaders slower than that, so sub-second page changes hold the previous page on screen. That is `keepPreviousData` behaviour delivered by the router instead. **✅ Confirmed 2026-08-17 on `/players`**: against the real (local) API, every search/position/page change resolved well under 1000 ms — the filters row and table stayed mounted with no flash, verified in a real browser via the network log (all requests 200, no visible pending state reached). The reverse case — a loader that genuinely exceeds `pendingMs` — was not separately reproduced (would need artificial latency injection), but follows directly from the router's documented behaviour once the fast case is confirmed to work as described.

   **Known, accepted limitation, not yet mitigated:** if a loader-driven navigation _does_ exceed `pendingMs`, `pendingComponent` fully replaces the route's rendered tree — including the filters row — since `/players`' `pendingComponent` is a full-page swap, same as every other screen's. A user mid-keystroke on a slow connection would see the search input unmount and remount empty rather than keep typing into it. Fixing this properly means splitting the shell (title + filters, always mounted) from the results region (table/pagination, in a nested `Suspense`) — out of scope for the first paginated screen; revisit if real usage against a slower (hosted) API shows it firing in practice.

   **Superseded 2026-08-19 — the decision below shipped, but the premise above is wrong, not just overtaken.** The claim that "the query key never changes while the component is mounted... swapping `useSuspenseQuery` → `useQuery` changes nothing" assumed the loader is the only thing that reads `search`. It isn't: `PlayersList` also calls `routeApi.useSearch()` directly, which is reactive independently of the loader. On a filter/sort/page change the component's own query key changes **while mounted**, so `useSuspenseQuery` throws immediately and the nearest Suspense boundary — the route's `pendingComponent`, a full-page swap — fires, exactly the "search input unmounts mid-keystroke" failure this gotcha already flagged as a known limitation in the loader-driven case. This was found empirically while root-causing a real bug (`onColumnFiltersChange` was silently resetting a deep-linked `page` back to 1 on mount — traced to MRT's own filter-state sync, not this mechanism, but the investigation is what surfaced the mount-time throw), then confirmed against TanStack Router/Query source. The **fix that shipped**: drop `loaderDeps` and `page`/filters/sort from it entirely, keep the loader as a one-time `ensureQueryData` warm-up on initial navigation only, and let the component own all subsequent reactivity via `useQuery` + `placeholderData: keepPreviousData` (not `useSuspenseQuery`) — the table body now stays mounted with an in-place progress bar (`state.showProgressBars: isFetching`) instead of a full-page pending swap. Verified live: rapid page/filter/sort changes show no flash, no unmount, network tab confirms one request per change. This is the same outcome the original "Decision" line below reached, but the mechanism and the reasoning that gets you there are different — the old prose is left in place, struck through in spirit, because it's a documented case of a plausible-sounding argument being wrong until traced through real usage, which is worth keeping as a record.

   **Decision (superseded, see above): ~~keep `page` in `loaderDeps` and use `useSuspenseQuery`, same as every other screen~~** — one uniform pattern, and the default threshold already delivers what `keepPreviousData` was wanted for. Tune `pendingMs` upward if the API proves slow, and prefer a subtle inline `useRouterState({ select: (s) => s.isLoading })` spinner over a full skeleton. ~~**Escape hatch, with a trigger:** if the players list measurably and consistently exceeds `pendingMs`, drop `page` from `loaderDeps` so the component owns pagination — at which point `useQuery` + `keepPreviousData` genuinely does work.~~ **This is what actually shipped — not on a measured-slowness trigger, but because the mount-time-throw mechanism above made it correctness-critical, not just an optimization.** That trade loses correct per-page preloading, which Players does not currently do (`defaultPreload` is still unset, gotcha #4).

2. **Loaders do not re-run on search-param change unless declared in `loaderDeps`.** True for state the _loader_ owns. Players sidesteps this rather than hitting it: the loader only warms the initial `search`, and the component's own `useQuery` — not the loader — is what re-fetches on every subsequent change, so there's no loader-owned page-2-serves-page-1 case to trigger here. Still real for a screen that keeps pagination in `loaderDeps`.
3. **Never return the whole `search` object from `loaderDeps`** — documented as a common mistake. A client-only toggle would refetch the server.
4. **`defaultPreload` is `false` by default** — nothing prefetches on hover until set.
5. **`defaultPreloadStaleTime: 0`** is required when Query owns the cache, or Router's 30 s preload window and Query's `staleTime` disagree.
6. **`useQueryErrorResetBoundary` is not optional** with suspense + `errorComponent`, or retry appears permanently broken.
7. **Suspense serialises queries within a component** — 5 `useSuspenseQuery` calls are 5 serial round trips unless the loader warmed them. Matters most on the match report.
8. **Zod 4 needs no `zodValidator`** — use the schema directly, and `.catch()` rather than v3's `fallback()`.
9. **Do not fan out `useQueries` over Compare's player ids.** `/api/v1/players/compare` takes `ids` as a **single comma-separated param** and resolves the peer group **once per position across the whole request** (`apps/api/src/routes/players-compare.ts`). Fanning out issues N round trips against an endpoint purpose-built to do it in one, and — worse — discards the shared peer-group resolution that is the endpoint's whole reason for existing. It matches `PROJECT.md` §4's "server-shaped, not thin passthroughs" principle. **Use one `queryOptions` factory keyed on the sorted id list**: `queryKey: ["players", "compare", { ids, season }]`. Sorted, so `?ids=1,2` and `?ids=2,1` share a cache entry. Reserve `useQueries` for genuinely independent per-entity fetches — the current API has none.
10. **The API rate-limits at 100 requests / 15 min per IP** (`apps/api/src/index.ts`, `middleware/rate-limiter.ts`), applied to `/api/v1/competitions` and `/api/v1/players/*` but not `/health`. This is a hard constraint on **any** fan-out or aggressive preload pattern, and it interacts directly with `defaultPreload: 'intent'` — hover-preloading a long list is a plausible way to burn the budget. Browser requests do not set `x-forwarded-for`, so every local request shares one bucket. Envelope on trip: `{"error":{"code":429,"message":"Too many requests"}}` — which the UI must render as a real, distinguishable error state rather than a generic failure.

### Documentation drift found during research

Treat these as known-stale rather than rediscovering them:

- TanStack Query's own `guides/prefetching.md` router-integration sample uses **pre-1.0 Router syntax** (`new RouterContext()`, `new Route({ getParentRoute })`). Prose current, sample stale.
- `guide/search-params.md` covers Zod v3 and v4 side by side — easy to copy the v3 path by mistake.
- `how-to/setup-testing.md` is for code-based routing; use `how-to/test-file-based-routing.md`.
- `kitchen-sink-react-query-file-based` imports `queryClient` from `../main`, contradicting the context-injection pattern the guides recommend. Prefer context injection.

---

## 4. State boundaries

Three homes. Route each new piece of state through these questions in order:

1. **Does the server own it?** → TanStack Query. Never mirror server state into a client store.
2. **Should it survive a reload or a shared link?** → URL search params, validated with the existing Zod.
3. **Neither?** → Zustand.

| State                                                                    | Home                      |
| ------------------------------------------------------------------------ | ------------------------- |
| Any API data                                                             | Query                     |
| Competition/season scope, pagination, filters, sort, compared player IDs | **URL search params**     |
| Navbar open/closed, theme preference                                     | Zustand — **when needed** |

**No Zustand store exists yet, and none is created speculatively.** Trigger: the first genuinely client-only cross-route state. Note the navbar `opened` state is a real candidate, since `AppShell` requires us to own it.

**Search params are the source of truth for Compare and Players.** Use `.catch()` rather than `.default()` so a malformed URL degrades instead of throwing. `stripSearchParams` keeps defaults out of the URL; `retainSearchParams(["season"])` carries scope across navigation.

**Deferred:** search-param state is only worth wiring when the first real filter, sort, or pagination lands — which is the Players screen, i.e. the second thing built.

---

## 5. Types and validation

`packages/shared` holds Zod schemas **generated from `packages/db`'s Drizzle tables** ([ADR 0013](../adr/0013-generate-shared-schemas-from-drizzle.md)) — raw table shapes only, not API-level derived shapes. Its barrel transitively imports **only `zod`**; `@console-next/db` and `drizzle-orm` are devDependencies there, so no Postgres driver can reach the browser bundle. Verified before `apps/web` took the dependency.

Promotion tiers, matching `docs/conventions/typescript.md`:

1. **Inline in the consuming file** — the default.
2. **Co-located within `apps/web`** — on the second consumer.
3. **`packages/shared`** — only for DB-derived types needed by a second _app_.

**Known gap:** a cross-app type with no DB backing has no home. `/api/v1/players/compare` returns percentile-ranked entries that are _not_ a table shape — the first real instance. Resolve when building Compare; do not pre-solve.

**Response validation stays at the trust boundary.** The shipped index screen `safeParse`s against `CompetitionSchema`; every screen does the same. Trust-boundary validation is explicitly never on the chopping block.

---

## 6. API client

**Done.** `apps/web/src/lib/api/` — `api-error.ts` (`ApiError` class, `isApiError` guard), `api-client.ts` (an `ApiClass` singleton exported as `API`, `configure()` + `getClient()`/`get<T>()`), `resource.ts` (`list()`/`retrieve()` — fetch via `get()`, then `safeParse` against the caller's schema), `types/{requests,http-method}.ts` (`Param`/`PathParams`/`QueryParams`, `HttpMethod`), `utils/{error,params,path}.ts`. Used by both `queries/competitions/competitions.ts` and `queries/players/players.ts`, via `queries/common/query-options.ts`'s `listQueryOptions()`/`retrieveQueryOptions()`, which wrap `resource.ts`'s functions in `queryOptions()`. See [ADR 0016](../adr/0016-wretch-for-api-client.md) for the full trade-off: hand-written, not generated from the OpenAPI document — 4 endpoints don't clear the bar where generation's payoff (not hand-typing shapes) beats what `packages/shared`'s existing Zod schemas already provide for free. **Response validation moved 2026-08-19** — see that ADR's correction note — from the `queries/` layer into `resource.ts`, once `retrieve()` needed the identical fetch-then-validate logic `list()` already had.

**Trigger: the third endpoint, or the first time base-URL or error handling is copy-pasted.** Building the Players screen crossed this; this work closed it.

**The CSP currently forbids this entire data path in production.** `infra/lib/hosting-stack.ts` sets `connect-src 'self'` — a deliberate fail-safe placeholder (ADR 0007), since no API origin is deployed yet. Every screen in these documents fetches cross-origin. Tracked in `TODO.md`, but recorded here because a data-loading design that never mentions the policy blocking it is missing a load-bearing constraint. Local dev is unaffected (Vite's dev server sends no CSP).

## 6a. Performance budget

The bundle argument in [ADR 0015](../adr/0015-visx-for-charting.md) is about charts. **The measured numbers say the real pressure is elsewhere.**

The entry chunk is **100.5 kB gzip** against a **150 kB per-chunk** limit — about 49 kB of headroom. Charts sit behind `autoCodeSplitting` on lazy routes and never moved the entry chunk in any measured scenario. But **shell components render on every route, so they land in the entry chunk — the one place code-splitting cannot help.** This design adds `AppShell` + navbar + 4 × `NavLink` + `Burger` + theme toggle + two scope `Select`s + skip link + live region + conditional `Breadcrumbs`, all always-rendered.

_(Reasoning from mechanism, not measurement.)_ **Resolving action: build the shell first, then read `apps/web/bundlemeta.json`.** If the shell eats the headroom, raising the 150 kB limit is a legitimate decision to make deliberately — not something to discover from a red CI run.

**Second pressure point, at scale:** at ~20 routes, Rollup hoists anything imported by 2+ lazy routes into a shared chunk. The percentile card (shared by Player detail and Compare) plus visx primitives is exactly that shape.

**Not yet specified:** any runtime budget. Neither document states an LCP or INP target. Worth setting once a real screen exists to measure.

---

## 7. Testing

Tests stay **beside their source** — page components under `src/components/pages/<feature>/`, route wiring under `src/routes/` (e.g. `players/-index.test.tsx`) — already correct, and what Vitest defaults to.

- **Unit/component**: Vitest + RTL + axe-core. `color-contrast` disabled (no jsdom layout engine), so **contrast is verified by design, not by test** — see [`frontend-ui-ux.md`](./frontend-ui-ux.md) §5.1.
- **Routes**: `createMemoryHistory` per `how-to/test-file-based-routing.md`, with a per-test `QueryClient` via `createQueryClient({ defaultOptions: { queries: { retry: false } } })`.
- **E2E**: `packages/e2e` (Playwright) — the only place chart contrast and focus management can be genuinely verified, since both need a real layout engine.

**`[UNVERIFIED]`** — no official example wires a memory-history test router _and_ a per-test `QueryClient` together. The composition is obvious (pass the client via `context`) but is synthesis, not documented. Confirm on the first route test.

## 7a. Observability

[ADR 0014](../adr/0014-sentry-for-error-tracking.md) accepted Sentry (hosted free tier) for error tracking, with `@sentry/react` for this app. **Nothing is wired yet** — that ADR is blocked on a real account and DSN, and this document does not change that.

Recorded here so the frontend's error strategy is not designed as if it were the whole story: the root error boundary and per-route `errorComponent` above handle what the _user_ sees; Sentry is what tells _us_ it happened. When the DSN lands, the boundary is the natural place to report from.

---

## 8. Summary: adopt now vs deferred

Three states, not two. **"Trigger already met"** is the honest middle: the condition has fired but the work is unscheduled, which is different from "not yet needed" and must not hide inside the deferred column.

| #   | Item                                             | State    | Trigger / note                                                                                                                                                                                                                                                                                                                            |
| --- | ------------------------------------------------ | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Route-folder colocation (`-` prefix)             | ✅ done  | Already correct                                                                                                                                                                                                                                                                                                                           |
| 2   | Tests beside source                              | ✅ done  | Already correct                                                                                                                                                                                                                                                                                                                           |
| 3   | Router context + provider rewiring               | ✅ done  | Landed 2026-08-16 — see `docs/plans/2026-08-15-router-query-context.md`                                                                                                                                                                                                                                                                   |
| 4   | Default `staleTime` (5 min)                      | ✅ done  | Landed with #3. Root error boundary + `notFoundComponent` deliberately split out as error-surface concerns — still to do                                                                                                                                                                                                                  |
| 5   | `queryOptions()` factories, request-derived keys | ✅ done  | `queries/competitions/competitions.ts`, landed with #3; generalized into `lib/api/resource.ts` + `queries/common/query-options.ts`'s `listQueryOptions()`/`retrieveQueryOptions()` (`resource.ts` moved there from `queries/common/list.ts` on 2026-08-19, see §2); see §2's correction note — keys are request-derived, not hierarchical |
| 6   | Search-param state                               | ✅ done  | Landed with the Players screen, 2026-08-17 through 2026-08-19 — `PlayersSearchSchema`, page/search/position/sort all in the URL                                                                                                                                                                                                           |
| 7   | API client (hand-written wretch, not generated)  | ✅ done  | Landed 2026-08-17 — see [ADR 0016](../adr/0016-wretch-for-api-client.md)                                                                                                                                                                                                                                                                  |
| 8   | `src/features/<domain>/`                         | 🔔 fired | The players branch is 3 routes on one entity — the stated trigger. Introduce for **that domain only**.                                                                                                                                                                                                                                    |
| 9   | `src/components/pages/<feature>/`                | ✅ done  | Superseded the second-consumer trigger — a route's page component always splits out, for testability. `src/components/common/` still second-consumer-gated; `src/hooks/` trigger fired 2026-08-19, see §2                                                                                                                                 |
| 10  | First Zustand store                              | ⏳ defer | First client-only cross-route state. Navbar `opened` is the likely first.                                                                                                                                                                                                                                                                 |
| 11  | Import-boundary enforcement                      | ⏳ defer | Lands with #8, but **only after** a deliberately-violating import proves Biome errors                                                                                                                                                                                                                                                     |
| 12  | Feature-Sliced Design                            | ❌ no    | Not this app                                                                                                                                                                                                                                                                                                                              |

---

## 9. Open questions

1. **Does the router-context rewiring go in its own change, or with the first screen that needs a loader?** Recommend its own — it touches `__root.tsx` and `main.tsx`, and bundling it with feature work makes both harder to review.
2. ~~**Generate the API client from OpenAPI, or hand-write one?**~~ Resolved 2026-08-17: hand-write, using `wretch`. See [ADR 0016](../adr/0016-wretch-for-api-client.md).
3. **Where do non-DB-derived cross-app types live?** See §5. First real instance is Compare's response shape.
