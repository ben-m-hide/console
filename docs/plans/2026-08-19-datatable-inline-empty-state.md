# DataTable: render empty state inline within the table body

## Context

`DataTable` currently swaps the _entire_ `<MantineReactTable>` out for a standalone
`EmptyState` component when `data.length === 0` — column header, filter row,
toolbars, and pagination all disappear along with the rows. The task: keep header
and footer visible, replace only the row area.

## Mechanism found (task explicitly asked to check before building custom)

MRT has a built-in `renderEmptyRowsFallback` table option, used internally by
`MRT_TableBodyEmptyRow.tsx`. Whenever `getRowModel().rows.length === 0`
(`MRT_TableBody.tsx`), MRT renders exactly one `<tr>` containing a single
`<td colSpan={table.getVisibleLeafColumns().length}>` holding
`renderEmptyRowsFallback?.({ table }) ?? <default text>`. This is automatic — no
opt-in flag beyond providing the callback — and everything else (header, top/bottom
toolbars, pagination) renders completely unaffected, since only the `<tbody>`
content changes.

## Approach

- Remove `DataTable`'s current top-level `if (data.length === 0) return
<EmptyState>...` branch. Always render `<MantineReactTable table={table} />`.
- Move the same three-variant `EmptyState` JSX (genuinely empty / filtered-to-empty
  with "Clear filters" / page-out-of-range with "Go to first page") into a
  `renderEmptyRowsFallback` callback passed into the `useMantineReactTable` call.
- Add `enablePagination: total > 0` — disables/hides pagination when there's
  nothing to page through. Confirmed with the user: sorting and filtering stay
  always-active regardless of empty state — filters especially need to stay
  editable so the user can adjust them to escape a filtered-empty state, not just
  rely on the "Clear filters" button.

## Files touched

- `apps/web/src/components/common/DataTable/DataTable.tsx` only.

## Test/type impact

`DataTable.test.tsx`'s 4 existing tests assert the empty-state text/buttons
render — same JSX, different MRT insertion point, expected to still pass. Will add
an assertion that the column header row is still present during an empty state
(the actual point of this task — old tests couldn't check this since the header
didn't exist at all in the old branch).

## Migration/breaking-change risk

Low — single existing consumer (`PlayersList`), same visual content relocated.

## Rollback

Trivial, single-file revert.

## Follow-up: implementation + verification results

Implemented as planned — `renderEmptyRowsFallback` and `enablePagination` added to
`ManagedOptionKeys` (consistent with every other DataTable-owned option) so a
consumer can't silently override empty-state rendering or pagination-enablement
via the passthrough spread.

Added a 5th `DataTable.test.tsx` test asserting the column header ("Name") stays
in the document alongside the empty-state text — the actual point of this task,
uncheckable under the old branch since the header didn't exist there at all. All 5
tests pass, including the 4 pre-existing ones unchanged.

Verified live: filtered-to-empty search shows header/filter row fully interactive,
"No players found" + "Clear filters" inline in the row area, pagination footer
absent (`total === 0`). Page-out-of-range (`?page=999`) shows "Page not found" +
"Go to first page" inline, header still visible, **pagination stays present and
usable** (`total > 0`) — clicked "Go to first page," confirmed it navigates to
`page=1` and real rows render correctly afterward.
