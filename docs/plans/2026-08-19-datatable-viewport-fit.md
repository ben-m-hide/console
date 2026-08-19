# DataTable viewport-fit (sticky header/footer actually pinned)

## Context

`enableStickyHeader`/`enableStickyFooter` were already set on `PlayersList`'s
`DataTable` call, but never actually kept the header/pagination footer in view —
the whole page scrolled past them instead. Never verified working after the
Collapse/Mantine-9 patch fix; this task is that verification plus the actual fix.

## Root cause

Confirmed via MRT source (`MRT_TableContainer.module.css`): `enableStickyHeader`
already works internally — the table container computes its own
`max-height: clamp(350px, calc(100vh - toolbarHeights), 9999px)`, and MRT's own JS
(`MRT_TableContainer.tsx`) measures its own top/bottom toolbar heights via
`offsetHeight` and feeds them into that calc through a CSS var. But that calc is
relative to the raw viewport (`100vh`), blind to anything _outside_ MRT — our
page's own `Title` + `Stack p="xl"` sit above it. Measured live: 92px from viewport
top to the table, plus 32px of `Stack` bottom padding below it ≈ 124px of page
chrome MRT has no way to know about. So the table container computes a max-height
that, combined with the page chrome around it, exceeds the viewport — the _page_
scrolls as a whole to reach pagination. Confirmed empirically: scrolling to the
pagination button (`find` + `scroll_to`) scrolled the `Title` out of view too, not
just table rows within an inner scroll region.

## Approach

Considered two options (advisor-reviewed):

- **Flex chain** (`Stack` h:100dvh + overflow hidden, `Title` shrink:0,
  `mantinePaperProps` flex column h:100% minHeight:0, `mantineTableContainerProps`
  flex:1 minHeight:0 **and cancel** `.root-sticky`'s clamp via `maxHeight: "none"`).
  More "correct" in principle, more surface area, and a `max-height: 100%` against a
  flex-sized parent combined with the Paper's own `overflow: hidden` is exactly the
  kind of thing that fails as _silent row clipping_ rather than a visible bug.
- **Feed MRT's existing calc the one number it's missing** (chosen): don't fight
  MRT's own mechanism, just override `mantineTableContainerProps`'s `maxHeight` with
  `calc(100dvh - 8rem)` — `8rem` (128px) derived from the 124px measured above, not
  guessed. Least moving parts; MRT still handles its own toolbar-height accounting
  dynamically via the CSS var, we're just correcting the baseline it calcs against.

Chosen: the second. Escalate to the flex-chain only if the single-offset approach
turns out insufficient (e.g. a future consumer needs per-page chrome of a
different height — not the case today, one page, one `DataTable` consumer).

## Files touched

- `apps/web/src/components/common/DataTable/DataTable.tsx` — add
  `mantineTableContainerProps: { style: { maxHeight: "calc(100dvh - 8rem)" } }` as a
  default in the `useMantineReactTable` call, placed _before_ `...tableOptions` so a
  future consumer can still override it (same pattern as every other managed
  default). No new prop — one shared default until a second consumer needs a
  different offset (YAGNI).
- `apps/web/src/components/pages/players/PlayersList.tsx` — remove
  `enableStickyFooter`. Confirmed no-op: it sticks the `<tfoot>` row, and none of
  our columns define a `Footer`. Misleading to leave in a change specifically about
  "the footer stays visible" — that's the _pagination_ toolbar, unaffected by this
  prop, which just naturally stays in view once the table container is
  height-bounded.

## Test/type impact

None — pure CSS, no prop/type changes. `DataTable.test.tsx` (jsdom, no layout
engine) can't verify viewport sizing either way — same reason this project already
disables `axe-core`'s `color-contrast` check in tests. Verified live instead.

## Verification (live browser, not just a screenshot)

1. `document.documentElement.scrollHeight === window.innerHeight` — the actual
   "page doesn't scroll" check; a screenshot alone already gave a false read once
   (looked pinned at a small scroll amount, turned out the whole page scrolled once
   reaching all the way to the pagination controls).
2. Scroll the _inner_ table container to its end, confirm the last row on the page
   renders — rules out silent clipping from the offset being wrong.
3. `?page=999` empty state renders correctly inside the bounded container, not
   clipped or oddly centered.
4. Resize to a short viewport (~500px) — `clamp()`'s `350px` floor plus the 128px
   offset could exceed a very short viewport; confirm graceful degradation (page
   scroll, not clipping).

## Migration/breaking-change risk

Low — CSS-only, one default + one dead-prop removal, single existing consumer.

## Rollback

Trivial — revert the one style object and the one prop removal.

## Follow-up: offset needed a second revision after re-enabling the top toolbar

Task #11 (table actions header) re-enabled `enableTopToolbar` on `PlayersList`,
which had been off since this offset was calibrated. The top toolbar (56px,
measured) sits above the table container as a sibling inside the Paper — chrome
this offset already needed to account for but couldn't, since it didn't exist yet
when `12rem` was derived. Confirmed live: page scrolled by 46px again immediately
after re-enabling the toolbar. Revised to `calc(100dvh - 16rem)` (256px — 192px
prior + 56px toolbar + small margin). Reconfirmed `scrollHeight === innerHeight`
afterward. Same caveat as before: this is one shared default sized for the single
current consumer's chrome, not a per-consumer computed value — revisit if a second
`DataTable` consumer needs different page chrome.

## Follow-up (same session): offset revised, verification results

First attempt used `calc(100dvh - 8rem)`, derived from measuring only the page
chrome _above_ the table (92px). Live-measured again after applying it: the page
still scrolled by 54px. Root cause of the miss — the offset didn't account for the
bottom pagination toolbar's own rendered height (57px), which sits _below_ the
scrollable table container but _inside_ the same page, plus the `Stack`'s bottom
padding (32px). Full overhead: 92 + 57 + 32 = 181px. Revised to `calc(100dvh -
12rem)` (192px, small safety margin over the exact 181px measurement).

**Verification results:**

1. `document.documentElement.scrollHeight === window.innerHeight` — now `true`
   (was `false`/scrolling by 54px before the offset correction).
2. Inner container scrolled to its end via `container.scrollTop =
container.scrollHeight`: all 25 rows present, last row rendered, `reachedEnd:
true`. No clipping.
3. `?page=999` empty state: renders correctly, centered, unaffected (that branch
   returns before `MantineReactTable` mounts at all).
4. Short-viewport degradation: **not empirically verified** — this session's
   `resize_window` tool didn't produce a real viewport change in this browser
   automation context (`window.outerHeight` read back as `0` after the call,
   `innerHeight` unchanged). Reasoned through instead: the override fully replaces
   `.root-sticky`'s `clamp(350px, ..., 9999px)`, so there's no floor under our
   value — on a short viewport `calc(100dvh - 12rem)` just shrinks further (stays
   positive down to a ~192px-tall viewport, unrealistic for any real device) rather
   than clipping or reintroducing page-scroll. Flagged here rather than silently
   assumed; revisit with real device/DevTools testing if this ever matters in
   practice.
