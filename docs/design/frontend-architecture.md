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

**The one thing the router does officially bless is route-folder colocation** via the `-` prefix — files excluded from the route tree but still importable, explicitly documented as "used to colocate logic in route folders". `apps/web` already does exactly this (`routes/-index-page.tsx`). **The project is already on the documented path.**

---

## 2. Structure

### Adopt now

Keep what exists. Promote on the **second consumer**, per the existing rule in root `CLAUDE.md` — which happens to match both Swizec's production writeup and React's own colocation guidance.

```
src/
├── routes/                     # file-based route tree
│   ├── __root.tsx
│   ├── index.tsx               # Dashboard
│   ├── compare.tsx
│   ├── players.index.tsx
│   ├── players.$playerId.tsx
│   ├── -queries/               # excluded from route tree, importable
│   │   └── players.ts          # queryOptions factories
│   └── -players-page.tsx       # colocated components
├── lib/                        # query-client.ts, theme.ts
└── main.tsx
```

`src/components/` and `src/hooks/` appear **when a second consumer needs them** — matching what every official example does, rather than pre-creating empty directories.

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

### ⚠️ The app cannot currently do this at all

`createRouter({ routeTree })` has **no `context`**, and `QueryClientProvider` renders **inside** `__root`'s component. Loaders run before the route component tree renders, so **a loader has no way to reach the query client as the app is wired today.**

This does not make the shipped index screen wrong — plain `useQuery` works, and is verified working in a browser. But the following are prerequisites for everything else in this section:

1. `createRootRouteWithContext<{ queryClient: QueryClient }>()` in `__root.tsx`; `RootComponent` drops `QueryClientProvider`, keeps `MantineProvider` + `Outlet` + devtools.
2. `main.tsx` — `createRouter({ routeTree, context: { queryClient }, defaultPreload: 'intent', defaultPreloadStaleTime: 0 })`, with `QueryClientProvider` wrapping `RouterProvider` **outside** it.
3. Keep the existing `createQueryClient(config?)` factory — it is what tests need.
4. **Set a default `staleTime` in that factory.** `defaultPreloadStaleTime: 0` deliberately makes Query the single source of freshness truth — but Query's own default `staleTime` is **0**, so leaving it unset means every hover over a `<Link>` fires a real request. That is acutely wrong here: the players table is hover-dense, the API rate-limits at 100 req/15 min (gotcha #10), and `PROJECT.md` §4 establishes these reads are "highly cacheable" because data only changes when the ingestion job runs every few hours. **Minutes, not zero** — loosely matched to the ingestion interval.
5. **Add a root error boundary and a `notFoundComponent`.** Per-route `errorComponent` does not catch a render error in the shell itself, and three routes take an ID param. CloudFront rewrites 403/404 to `/index.html` at HTTP 200 (ADR 0007), so a deep link to a nonexistent ID lands in the app — `notFound()` + `notFoundComponent` is what turns that into an honest message instead of a crash or an empty list. Note `NotFoundRoute` is deprecated.

### Per-route pattern

```tsx
// routes/-queries/players.ts
export const playersQueryOptions = (params: PlayersParams) =>
  queryOptions({
    queryKey: ["players", params],
    queryFn: ({ signal }) => fetchPlayers(params, signal),
  });

// routes/players.index.tsx
export const Route = createFileRoute("/players/")({
  validateSearch: playerSearchSchema, // Zod 4 directly — no adapter
  loaderDeps: ({ search: { page, season } }) => ({ page, season }),
  loader: ({ context: { queryClient }, deps }) =>
    queryClient.ensureQueryData(playersQueryOptions(deps)),
  component: PlayersPage,
  pendingComponent: PlayersSkeleton,
  errorComponent: PlayersError,
});
```

**Adopt now: `queryOptions()` factories with hierarchical keys** (`["players", "list", filters]` / `["players", "detail", id]`), colocated in `routes/-queries/`. Highest value-to-cost item available — it is the single definition shared between a loader and a component, and it is already justified at one query.

| Screen                | Pattern                                                                                         |
| --------------------- | ----------------------------------------------------------------------------------------------- |
| Dashboard             | loader + `ensureQueryData` for the summary; unawaited `prefetchQuery` for leaders               |
| Players (paginated)   | `loaderDeps` + `useSuspenseQuery`, same as everything else; `pendingMs` governs — see gotcha #1 |
| Player detail         | loader + `useSuspenseQuery`                                                                     |
| Compare               | search params as source of truth; **one** query over the whole id list — see gotcha #9          |
| Competitions / detail | loader awaits the competition; unawaited `prefetchQuery` for fixtures                           |
| Match report          | loader awaits the header only; prefetch the rest unawaited                                      |

### Gotchas that must not be discovered during implementation

1. **The paginated-list trap is the reasoning about it, not the pattern.** The tempting chain — "Query says use `placeholderData: keepPreviousData`; `useSuspenseQuery` doesn't have it; therefore don't use suspense on the players list" — **is wrong, and an earlier draft of this document fell for it.** Trace what actually happens with `loaderDeps: ({ search }) => ({ page })` when the user clicks page 2: the loader key changes, the loader `await`s `ensureQueryData({ page: 2 })`, and **the component does not re-render with the new page until that resolves** — so page 2 is already warm by first render. The query key never changes while the component is mounted and rendering, meaning `keepPreviousData` has nothing to bridge and never engages. **Swapping `useSuspenseQuery` → `useQuery` changes nothing.** Any blank comes from the Router's pending state, not from Query.

   What actually governs the UX is **`pendingMs` (default 1000 ms)** — the `pendingComponent` renders only for loaders slower than that, so sub-second page changes hold the previous page on screen. That is `keepPreviousData` behaviour delivered by the router instead. **`[UNVERIFIED]`** — the 1000 ms threshold is documented, but that the previous UI persists until then is the natural reading of the docs rather than something anyone has run. **Confirm empirically on the first paginated route.**

   **Decision: keep `page` in `loaderDeps` and use `useSuspenseQuery`, same as every other screen** — one uniform pattern, and the default threshold already delivers what `keepPreviousData` was wanted for. Tune `pendingMs` upward if the API proves slow, and prefer a subtle inline `useRouterState({ select: (s) => s.isLoading })` spinner over a full skeleton. **Escape hatch, with a trigger:** if the players list measurably and consistently exceeds `pendingMs`, drop `page` from `loaderDeps` so the component owns pagination — at which point `useQuery` + `keepPreviousData` genuinely does work. That trade loses correct per-page preloading.

2. **Loaders do not re-run on search-param change unless declared in `loaderDeps`.** Omit it and page 2 silently serves page 1's data.
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

**Deferred.** One configured client (or a client generated from `apps/api`'s OpenAPI document) is right eventually — prefer generating over hand-writing, since the OpenAPI doc already exists at `/doc`.

**Trigger: the third endpoint, or the first time base-URL or error handling is copy-pasted.** Building the Players screen crosses this almost immediately — so this is **already-fired, not deferred**; sequence it into that work.

**The CSP currently forbids this entire data path in production.** `infra/lib/hosting-stack.ts` sets `connect-src 'self'` — a deliberate fail-safe placeholder (ADR 0007), since no API origin is deployed yet. Every screen in these documents fetches cross-origin. Tracked in `TODO.md`, but recorded here because a data-loading design that never mentions the policy blocking it is missing a load-bearing constraint. Local dev is unaffected (Vite's dev server sends no CSP).

## 6a. Performance budget

The bundle argument in [ADR 0015](../adr/0015-visx-for-charting.md) is about charts. **The measured numbers say the real pressure is elsewhere.**

The entry chunk is **100.5 kB gzip** against a **150 kB per-chunk** limit — about 49 kB of headroom. Charts sit behind `autoCodeSplitting` on lazy routes and never moved the entry chunk in any measured scenario. But **shell components render on every route, so they land in the entry chunk — the one place code-splitting cannot help.** This design adds `AppShell` + navbar + 4 × `NavLink` + `Burger` + theme toggle + two scope `Select`s + skip link + live region + conditional `Breadcrumbs`, all always-rendered.

_(Reasoning from mechanism, not measurement.)_ **Resolving action: build the shell first, then read `apps/web/bundlemeta.json`.** If the shell eats the headroom, raising the 150 kB limit is a legitimate decision to make deliberately — not something to discover from a red CI run.

**Second pressure point, at scale:** at ~20 routes, Rollup hoists anything imported by 2+ lazy routes into a shared chunk. The percentile card (shared by Player detail and Compare) plus visx primitives is exactly that shape.

**Not yet specified:** any runtime budget. Neither document states an LCP or INP target. Worth setting once a real screen exists to measure.

---

## 7. Testing

Tests stay **beside their source** (`-index-page.test.tsx`) — already correct, and what Vitest defaults to.

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

| #   | Item                                                          | State    | Trigger / note                                                                                                      |
| --- | ------------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------- |
| 1   | Route-folder colocation (`-` prefix)                          | ✅ done  | Already correct                                                                                                     |
| 2   | Tests beside source                                           | ✅ done  | Already correct                                                                                                     |
| 3   | Router context + provider rewiring                            | ✅ now   | **Prerequisite for all loader work**                                                                                |
| 4   | Default `staleTime`, root error boundary, `notFoundComponent` | ✅ now   | Part of the same rewiring — see §3                                                                                  |
| 5   | `queryOptions()` factories, hierarchical keys                 | ✅ now   | Prerequisite of the first loader-driven fetch. (Not "justified at one query" — the app has **zero** queries today.) |
| 6   | Search-param state                                            | 🔔 fired | Players is build-order step 1 and needs pagination + filters. Sequence it in.                                       |
| 7   | Generated API client                                          | 🔔 fired | Players + Player detail cross the third-endpoint line immediately                                                   |
| 8   | `src/features/<domain>/`                                      | 🔔 fired | The players branch is 3 routes on one entity — the stated trigger. Introduce for **that domain only**.              |
| 9   | `src/components/`, `src/hooks/`                               | ⏳ defer | Second consumer **of a given component or hook** (not of a type — §5 owns type promotion)                           |
| 10  | First Zustand store                                           | ⏳ defer | First client-only cross-route state. Navbar `opened` is the likely first.                                           |
| 11  | Import-boundary enforcement                                   | ⏳ defer | Lands with #8, but **only after** a deliberately-violating import proves Biome errors                               |
| 12  | Feature-Sliced Design                                         | ❌ no    | Not this app                                                                                                        |

---

## 9. Open questions

1. **Does the router-context rewiring go in its own change, or with the first screen that needs a loader?** Recommend its own — it touches `__root.tsx` and `main.tsx`, and bundling it with feature work makes both harder to review.
2. **Generate the API client from OpenAPI, or hand-write one?** Generation is preferred but the generator has not been evaluated for a `@hono/zod-openapi` backend.
3. **Where do non-DB-derived cross-app types live?** See §5. First real instance is Compare's response shape.
