# Generic `DataTable` component (mantine-react-table) + Players list migration

## Context

Wanted `mantine-react-table` (MRT) for data tables. Research before touching files found it stalled: latest publish `2.0.0-beta.9` (2025-02-17), peer-deps `@mantine/core@^7.9` against this project's `^9.5.1`, and an open unresolved Mantine v8-support issue (upstream `#516`, filed May 2025, still unanswered). A throwaway spike (`bun add` + a minimal `tsc --strict` + a vitest/RTL render) proved MRT does render cleanly against Mantine 9.5.1 + React 19 + TS 7 — so the block isn't a physical incompatibility, it's staleness risk on a dependency this project would otherwise be betting its whole generic-table layer on.

Compared against `mantine-datatable`: actively maintained, homepage explicitly states Mantine V9.x support, zero runtime dependencies (`dependencyCount: 0` per bundlephobia), 14.9 KB gzip vs MRT's 50.3 KB gzip (which bundles `@tanstack/react-table` + `@tanstack/react-virtual` + `@tanstack/match-sorter-utils`). Feature gap vs MRT: no built-in global/column filter UI, column-visibility/pinning menu, grouping/aggregation, editing modes, or virtualization. Checked whether virtualization is realistically DIY-able — a community PR (`icflorescu/mantine-datatable#690`) attempting it sat open ~16 months fighting sticky-header/row-expansion/drag-drop positioning conflicts and was closed unmerged by the maintainer. Not needed here regardless: players list is server-paginated at `DEFAULT_PAGE_SIZE = 25`, so the DOM never holds more than ~25 rows.

User decision: `mantine-datatable`, confirmed after both the DIY-feasibility and performance questions were researched (not guessed).

## Divergence found mid-implementation — reverted to `mantine-react-table`

Plan originally approved for `mantine-datatable` and implemented. `bun run typecheck`/`lint` passed, but `routes/players/-index.test.tsx` failed 3 of 7 tests under vitest/jsdom. Isolated debug tests (raw `mantine-datatable` component, no wrapper) showed: the cell `render()` callback fired with the correct record, but the row still came back empty in the final DOM (`<thead><tr/></thead>`, `<tbody><tr/></tbody>`, "No records" empty state shown despite 1 record passed) — reproduced identically with and without `storeColumnsKey`. Traced into their minified bundle: an internal `useLocalStorage`-backed column-order/visibility hook re-renders after mount and appears to wipe `effectiveColumns` under jsdom specifically.

Verified against a live dev server + real API data that `mantine-datatable` renders correctly for real users in an actual browser — this is a jsdom-only incompatibility, not a broken library. Their own GitHub discussion asking this exact "testing with RTL" question (`icflorescu/mantine-datatable#649`) has zero replies — no known community fix.

Given this project's stated purpose (genuine, verifiable practice — a working, testable app, not "works for me, tests skipped") and the "reproduce, fix, re-verify" methodology this project applies to every other bug, shipping a library that's demonstrably broken in its own test suite — with no bounded fix in sight — was rejected in favor of reverting to MRT, which already had two clean empirical data points from the earlier spike (fresh `tsc --strict` compile, clean jsdom/RTL render). Confirmed by user ("what do you suggest?" → recommendation followed).

**MRT is pinned exactly** (`"mantine-react-table": "2.0.0-beta.9"`, not floated `^`) — never reached a stable release, so a routine "compatible" bump is not a safe assumption the way it would be for a real semver-major package; matches the pinning policy's intent (`aws-cdk-lib`/`hono`-style large/no-safety-net dependency) even though it's not one of the two named examples.

## Files touched

- `apps/web/package.json` — `mantine-react-table` (pinned `2.0.0-beta.9`) + real peer deps: `@mantine/dates` (`^9.5.1`), `dayjs`, `clsx`, `@tabler/icons-react` (all floated `^`, default policy).
- `apps/web/src/main.tsx` — `import "@mantine/dates/styles.css";` and `import "mantine-react-table/styles.css";` after the existing `@mantine/core/styles.css` (MRT's docs are explicit about load order).
- `apps/web/src/components/common/DataTable.tsx` — new generic wrapper component. Single file, no barrel — matches the existing flat `common/` layout (`GenericError.tsx`, `GenericPending.tsx`).
- `apps/web/src/components/pages/players/PlayersList.tsx` — replace the hand-rolled `<Table>` block with `<DataTable>`.

## Approach

MRT's API is a hook (`useMantineReactTable(options)`) + a render component (`<MantineReactTable table={table} />`), not direct props like `mantine-datatable`. `DataTable.tsx` wraps both steps into one generic component so callers don't need to learn the two-step pattern, while still accepting the full `MRT_TableOptions<T>` surface for pass-through (any future consumer can reach sorting, selection, editing, grouping, virtualization, etc. without the wrapper needing to know about them):

```tsx
export const DataTable = <T extends Record<string, unknown>>(
  options: MRT_TableOptions<T>,
): ReactElement => {
  const table = useMantineReactTable(options);
  return <MantineReactTable table={table} />;
};
```

**`FC` convention deviation, deliberate:** `docs/conventions/react.md` mandates `FC` on every function component. `FC<Props>` cannot express a component generic over `T` — a structural TS limitation, not a style call. Resolved as a documented one-off exception: a short in-file comment explaining why this component isn't typed `FC`, rather than a `docs/conventions/react.md` addendum — revisit as a real convention entry only if a second generic component shows up (same "extract on second use" rule the codebase already applies to code and types).

**Players list migration — behavior-preserving, no new features.** `PlayersList.tsx` already drives search/filter through its own UI (`TextInput`/`Select` above the table, synced to URL search params) — none of that changes. `<DataTable>` gets `columns` + `data={players}` plus every MRT feature toggle explicitly turned off (`enableTopToolbar`, `enableSorting`, `enableColumnActions`, `enableColumnFilters`, `enableGlobalFilter`, `enableHiding` — all `false`) so it renders as a plain table matching the old hand-rolled one, not a surprise feature drop-in. Pagination was initially kept as the pre-existing standalone Mantine `<Pagination>` below the table (see "deferred" note, superseded below).

**Follow-up (same session): wired server-side pagination into MRT's own footer.** Replaced the standalone `<Pagination>` + `<Text>{meta.total} players</Text>` block with MRT's built-in pagination, in manual/server-driven mode:

```tsx
<DataTable
  columns={columns}
  data={players}
  ...
  manualPagination
  rowCount={meta.total}
  pageCount={meta.totalPages}
  paginationDisplayMode="pages"
  mantinePaginationProps={{ showRowsPerPage: false }}
  state={{ pagination: { pageIndex: meta.page - 1, pageSize: meta.pageSize } }}
  onPaginationChange={handlePaginationChange}
/>
```

Key finding that de-risked this: `paginationDisplayMode: "pages"` makes MRT reuse Mantine's own `<Pagination>` component internally (confirmed via context7 docs, not guessed) — so the numbered-button DOM the existing test asserts on (`getByRole("button", { name: "2" })`) stayed intact with zero test changes needed. `showRowsPerPage: false` keeps the footer from exposing a page-size selector that isn't wired to anything (behavior parity with the old UI, not a new feature). `handlePaginationChange` converts between MRT's `{pageIndex, pageSize}` (0-based) and this app's `page`/`pageSize` URL search params (1-based), handling both the function-updater and direct-value forms of TanStack Table's `Updater<T>` type. Verified live in the browser: clicking page "2" updates the URL and refetches real page-2 data.

Columns:

```tsx
const columns: Array<MRT_ColumnDef<Player>> = [
  { accessorKey: "name", header: "Name" },
  { accessorKey: "position", header: "Position" },
  { accessorKey: "nationality", header: "Nationality" },
  { accessorKey: "dateOfBirth", header: "Date of birth" },
];
```

`Player` imported from `@console-next/shared` (`packages/shared/src/schemas/player.gen.ts`).

## Test/type impact

- `routes/players/-index.test.tsx`: all 7 tests pass (verified by running, not assumed) — including the pagination-button assertion (`getByRole("button", { name: "2" })`), untouched since the existing manual `<Pagination>` wasn't touched.
- Full `apps/web` suite: 22/22 pass.
- `bun run typecheck`, `bun run lint`, `bun run build` — all clean. `bun audit --audit-level=high` — no advisories.
- Build's `players` bundlesize chunk sits at 139.2/150 kB gzip (configured limit) — driven by MRT's dependency weight (`@tanstack/react-table` + `@tanstack/react-virtual` + `@tanstack/match-sorter-utils` + `@tabler/icons-react` + `dayjs`). Passes today; worth knowing this chunk has little headroom left for anything else added to the players route.
- Verified live in a real browser (dev server + real local-dev API data): table renders, search/filter/pagination all functional, zero console errors.

## Migration/breaking-change risk

Low for behavior (no API/schema/route-param change, feature-toggle-equivalent to the old table). Real risk is the one this plan exists to record: MRT's own staleness (no official Mantine 8/9 support, beta since Feb 2025) — accepted as the lesser risk against `mantine-datatable`'s proven jsdom breakage.

## Rollback

New component file, one modified page component, a handful of dependency/import lines. `git revert` or manual undo of the diff.

## Follow-up (same session): server-side sorting + built-in column filtering, plus a real MRT/Mantine-9 incompatibility

Wired `manualSorting`/`manualFiltering` into MRT, per user decision: built-in column filter UI (not a custom `TextInput`/`Select`), single-column sort for now, `sort`/`sortDirection` as two separate URL params. Backend gained `resolveSort()` (whitelisted column map, `name`/`position`/`nationality`/`dateOfBirth`, falls back to `name asc` for anything unrecognized — same "degrade to something sane" pattern as `resolvePagination`) and an `id` tiebreak on every query (`orderBy(orderBy(column), asc(players.id))` — without it, rows can shift between pages under a non-unique sort column). Frontend added `onSortingChange`/`onColumnFiltersChange` handlers mirroring `onPaginationChange`'s updater-conversion shape, and replaced the old custom search box + position `Select` with MRT's own column filter inputs.

**Bug found: MRT's built-in filter row silently rendered empty (`display: none` on an ancestor `Flex`) no matter what.** Diagnosed by bypassing the UI — stashed the live `table` instance on `window.__debugTable` and called `column.setFilterValue('Haaland')` directly, which updated the URL instantly, proving the app's own `onColumnFiltersChange` → `handleColumnFiltersChange` → `navigate()` chain was correct. The break was inside MRT itself.

Root cause, confirmed against primary sources (not guessed): `mantine-react-table` has **never** published a version with a peer dependency above `@mantine/core: ^7.9` (checked the npm registry across all 89 published versions, including every 2.x beta up to our pinned `beta.9`) — but this project runs `@mantine/core@9.5.1`. Cross-referencing Mantine's official `7x-to-8x`/`8x-to-9x` migration guides against every file in MRT's source (83 files, scripted via GitHub's tree + raw-content APIs) turned up exactly one functional breaking change MRT's code actually hits: Mantine 9 renamed `Collapse`'s `in` prop to `expanded` (silently dropped, not a runtime error — `Collapse` just stays permanently collapsed). Every other 7→8/8→9 breaking change (`Grid gutter→gap`, `positionDependencies`, `Text color` prop, `Popover hideDetached`, etc.) has zero usages in MRT's source — not a broad incompatibility, one narrow one.

Affects 5 components, all using the same `<Collapse in={...}>` pattern: the column-filter row (this bug), row detail-panel expansion, the global filter box, the toolbar alert banner, and the top loading progress bar (the last two aren't wired up yet but would have hit the same bug when they are).

**Fix: `bun patch`, not a fork.** A full fork would mean matching MRT's own build tooling (pnpm/Turborepo monorepo) and taking on a rebase burden every time the beta moves, for what turned out to be 5 mechanical one-line renames. Instead:

```sh
bun patch mantine-react-table@2.0.0-beta.9
# edit dist/index.esm.mjs and dist/index.cjs: `in:` -> `expanded:` on the 5 Collapse call sites
bun patch --commit 'node_modules/mantine-react-table'
```

Result: `patches/mantine-react-table@2.0.0-beta.9.patch` (tracked in git) + a `patchedDependencies` entry in root `package.json`, reapplied automatically by every `bun install`. Gotcha hit during verification: Vite's dependency pre-bundle cache (`apps/web/node_modules/.vite/deps/`) doesn't invalidate on a patched package's content change while the dev server keeps running — had to delete the cache dir and restart the Vite process before the patched bundle actually loaded in the browser.

Verified live (real dev server, real DB data): filter row renders inline under the headers (not popover — reverted that experiment, the default/subheader mode is what MRT's own server-side-filtering docs demonstrate), typing "Aaron" filters to the 7 matching players with match-highlighting, combining with the Position `select` filter (`position=Defender`) narrows to the intersection, and sorting/pagination still work unchanged.

**Known gap:** the automated suite doesn't exercise the filter inputs themselves — both filter tests in `-index.test.tsx` drive `search`/`position` via direct URL navigation (documented in-file as a jsdom `Collapse`-measurement limitation, still valid) rather than simulating typing, so this class of bug is invisible to CI. Live-browser verification is the only thing that caught it.

Still outstanding from this session, not yet started: extracting DataTable pagination/sorting/filtering handler logic into a reusable hook, moving the players route off `useSuspenseQuery` so sort/filter/pagination changes don't full-page-reload, and confirming `enableStickyHeader`/`enableStickyFooter` (currently on, not yet explicitly re-verified after the patch).
