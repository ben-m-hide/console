# Generic `useServerDataTable` hook

## Context

`PlayersList.tsx`'s pagination/sorting/filtering wiring (three ~20-line handlers converting between MRT's `MRT_Updater<T>` pattern and this app's URL-search-param state, plus a `tableState` memo) is the only real logic in the component, and would be rewritten near-identically by any future list screen (teams, fixtures, competitions) that adopts the same `DataTable` + manual-mode MRT pattern. Extract it into a reusable hook so `DataTable`'s consumers wire a small per-entity config instead of reimplementing the updater-resolution/URL-sync logic each time.

`DataTable` itself (`src/components/common/DataTable.tsx`) stays untouched — a pure `MRT_TableOptions<T>` pass-through, deliberately router-agnostic. The hook is a separate, composable layer that produces the props a consumer spreads onto `<DataTable>`.

## Design

**What generalizes fully, no per-consumer config:**

- **Pagination** — `page`/`pageSize` are already standardized via `ListSearchSchema` (every list route extends it).
- **Sorting** — generalizes once `sort`/`sortDirection` are lifted into a shared schema shape, parameterized per entity's own sortable-field enum (`PlayerField` today).

**What needs a small declarative map:**

- **Filtering** — which columns are filterable and what search-param name each maps to is real domain knowledge (`name` → `search`, `position` → `position`). But the _logic_ (empty string → `undefined`, `MRT_Updater` resolution) is identical for both of today's filters — proven by them already reducing to the same rule — so only the id→param mapping is consumer-supplied, not the normalization behavior.

**Deliberately out of scope:** filters are scalar-only (text/select, `string | undefined`-shaped search params). Range/date filters would need a different value shape — left as an explicit future extension once a real consumer needs one, not guessed at now.

## Files touched

| File                                                    | Change                                                                                                                                |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/web/src/routing/search.ts`                        | Add `sortableSearchShape(fieldEnum)` — a Zod shape factory (`{ sort, sortDirection }`) generic over any entity's sortable-field enum. |
| `apps/web/src/routing/player.ts`                        | Use `sortableSearchShape(PlayerField)` in place of inlined `sort`/`sortDirection` fields — identical resulting schema.                |
| `apps/web/src/hooks/useServerDataTable.ts` _(new)_      | The hook.                                                                                                                             |
| `apps/web/src/hooks/useServerDataTable.test.ts` _(new)_ | Unit tests via `@testing-library/react`'s `renderHook` — pure logic, no jsdom/Collapse rendering concerns.                            |
| `apps/web/src/hooks/index.ts` _(new)_                   | Barrel, matching `src/lib/index.ts`/`src/queries/index.ts`'s flat-export pattern.                                                     |
| `apps/web/src/components/pages/players/PlayersList.tsx` | Retrofit onto the hook — deletes the three handlers, `PlayersTableState`, `handleClearFilters`, `handleGoToFirstPage`.                |

## API

```ts
export interface ServerDataTableSearch {
  page: number;
  pageSize: number;
  sort?: string;
  sortDirection?: SortDirection;
}

// Only keys of Search that are string|undefined-shaped — keeps filterFields
// honest about the scalar-only scope above.
type OptionalStringKey<Search> = {
  [K in keyof Search]: Search[K] extends string | undefined ? K : never;
}[keyof Search];

type FilterFieldMap<Search> = Record<string, OptionalStringKey<Search>>;

export interface ServerDataTable<Search> {
  state: {
    pagination: MRT_PaginationState;
    sorting: MRT_SortingState;
    columnFilters: MRT_ColumnFiltersState;
  };
  onPaginationChange: (updater: MRT_Updater<MRT_PaginationState>) => void;
  onSortingChange: (updater: MRT_Updater<MRT_SortingState>) => void;
  onColumnFiltersChange: (updater: MRT_Updater<MRT_ColumnFiltersState>) => void;
  hasActiveFilters: boolean;
  clearFilters: () => Promise<void>;
  goToFirstPage: () => Promise<void>;
}

export const useServerDataTable = <
  Search extends ServerDataTableSearch,
  FilterFields extends FilterFieldMap<Search>,
>(params: {
  search: Search;
  setSearch: (updater: (previous: Search) => Search) => Promise<void>;
  filterFields: FilterFields;
}): ServerDataTable<Search> => {
  /* ... */
};
```

`setSearch` is a plain `(updater) => Promise<void>` — not TanStack Router's `navigate` directly — so the hook stays router-agnostic. A consumer adapts their route's `navigate` in one line: `(updater) => navigate({ search: updater })`.

**Behavior change from today, deliberate:** `state.pagination` is built from `search.page`/`search.pageSize` directly, not from the API response's `meta.page`/`meta.pageSize` (today's `tableState` memo uses `meta`, while the change-handlers already use `search` — an existing inconsistency). Using `search` uniformly is safe — the out-of-range-page case already routes to `EmptyState` before `<DataTable>` ever renders — and fully decouples the hook from knowing anything about API response shape.

## Test/type impact

- New hook gets direct unit coverage: pagination/sorting/filtering (both direct-value and updater-function `MRT_Updater` forms), `hasActiveFilters`, `clearFilters`, `goToFirstPage`.
- `apps/web/src/routes/players/-index.test.tsx` should need zero changes — same URL params for the same interactions is the acceptance bar. Run it, don't edit it, unless something genuinely regresses.
- Full pipeline (typecheck/lint/test/build/`bun audit --audit-level=high`) before calling this done.

## Migration/breaking-change risk

Low — new files plus a same-behavior retrofit of one existing component, no route/schema/API contract changes. `PlayersList.tsx` drops from ~237 lines to roughly ~150.

Worth being explicit: this generalizes infrastructure for what is currently a single real consumer (`PlayersList`) — a deliberate call, made consciously after discussion, not a default the design fell into.

## Rollback

Plain `git revert` — nothing else depends on the new files yet.

## Follow-up (same session): collapsed the hook into `DataTable` itself

After landing the above, the user wanted deeper encapsulation than "hook lives outside the consumer" — the stated goal: a consumer should just call `<DataTable ... />` with props and get the whole thing, no separate hook call, no `EmptyState` branching in the page component. Two designs were discussed:

1. Keep `DataTable` as the thin MRT wrapper, add a second component (`ServerDataTable`) on top that owns the hook + empty state.
2. Collapse everything into `DataTable` itself.

**User picked option 2.** `DataTable`'s public contract changes from "accepts the full `MRT_TableOptions<TData>` bag" to an opinionated, server-driven-list-specific surface:

```ts
type ManagedMrtOptionKeys =
  | "columns"
  | "data"
  | "state"
  | "manualPagination"
  | "manualSorting"
  | "manualFiltering"
  | "onPaginationChange"
  | "onSortingChange"
  | "onColumnFiltersChange"
  | "rowCount"
  | "pageCount"
  | "paginationDisplayMode";

interface DataTableProps<
  TData extends Record<string, unknown>,
  Search extends ServerDataTableSearch,
  FilterFields extends FilterFieldMap<Search>,
> extends Omit<MRT_TableOptions<TData>, ManagedMrtOptionKeys> {
  columns: Array<MRT_ColumnDef<TData>>;
  data: Array<TData>;
  meta: ListMetaParams; // already exists, routing/search.ts — no new type needed
  search: Search;
  setSearch: (updater: (previous: Search) => Search) => Promise<void>;
  filterFields: FilterFields;
  entityNamePlural: string; // drives all three empty-state messages generically
}
```

`DataTable` now calls `useServerDataTable` and `useMantineReactTable` unconditionally (both every render, per Rules of Hooks — the empty-state branch is a return-value decision made _after_ both hooks run, not a conditional hook call), and renders either `EmptyState` (three variants: genuinely empty, page-out-of-range, filtered-to-empty — same three messages `PlayersList` had, now generic via `entityNamePlural`) or `<MantineReactTable table={table} />`. `manualPagination`/`manualSorting`/`manualFiltering`/`paginationDisplayMode="pages"` are now hardcoded internals, not consumer-set — that's the whole point of this being _the_ server-driven table. Anything still cosmetic/situational (`enableStickyHeader`, `enableTopToolbar`, etc. — relevant to the still-open viewport-fit and actions-header tasks) stays as pass-through props via the `Omit<MRT_TableOptions<TData>, ManagedMrtOptionKeys>` spread, so those tasks won't need to touch `DataTable`'s contract again.

`useServerDataTable` itself (the hook file, its tests, `sortableSearchShape`) is unchanged — it becomes an internal implementation detail of `DataTable` rather than something `PlayersList` calls directly.

**Deliberate tradeoff, accepted:** `DataTable` loses its former "works for any MRT use case, no server-state assumptions" generality. A future non-server-driven or non-URL-state table would need a new/separate component split back out at that point — not guessed at now.

**Bug found and fixed during live verification: genuinely out-of-range pages (`?page=999`) silently redirected to page 1.** Root cause: calling `useMantineReactTable` unconditionally (required by Rules of Hooks — it can't be skipped just because the empty-state branch will be rendered instead) means MRT/Mantine's own pagination footer always receives the real `pageIndex`, even when it's wildly out of bounds. Mantine's `<Pagination>` (reused internally via `paginationDisplayMode="pages"`) self-corrects an out-of-range active page on mount by firing `onChange`, which flows through `onPaginationChange` → `setSearch` → `navigate`, silently overwriting the URL back to page 1 before the user ever sees the "Page not found" state. Fixed by clamping only the `pageIndex` fed into `useMantineReactTable`'s `state.pagination` (`Math.min(pageIndex, totalPages - 1)`) — the `EmptyState` branch's own out-of-range messaging reads the unclamped `search.page`/`data.length` directly, so it's unaffected. Two independently-required call sites, two different concerns: the hook's `state` still reports the real pageIndex (correct for anything else consuming it later); the clamp is `DataTable`-local, applied only to what MRT itself is fed.

**Files touched (this follow-up):**

- `apps/web/src/components/common/DataTable.tsx` — full rewrite per the above.
- `apps/web/src/components/common/DataTable.test.tsx` _(new)_ — unit coverage for the three empty-state branches plus the real-table-renders-when-data-present case (jsdom-safe: no `Collapse`/`Popover` interaction needed for these assertions).
- `apps/web/src/components/pages/players/PlayersList.tsx` — shrinks further: no `useServerDataTable` import, no `EmptyState` JSX, no branching — just `columns`, `filterFields`, the `setSearch` adapter, and one `<DataTable ...props />`.

Acceptance bar unchanged: `apps/web/src/routes/players/-index.test.tsx` needs zero changes, full pipeline clean, live-browser re-verification of filter/sort/pagination/empty-state paths.
