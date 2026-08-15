# visx for charting and data visualisation, over Mantine Charts/Recharts

## Status

Accepted — decision only, nothing built. No chart exists in `apps/web` yet.

**Why record this now, given nothing can be built against it?** `docs/adr/README.md` requires a decision be hard to reverse, surprising without context, and a genuine trade-off. This one clears (2) and (3) easily but is arguably soft on (1) — it says so itself under Consequences ("reversible at low cost for item 1"). It is recorded anyway because the **reasoning** is what is hard to reconstruct, not the code: the research recommended the opposite library, and the tiebreak was a product-roadmap judgement made on a specific day. Six months on, "why not the obvious Mantine option?" is exactly the question this directory exists to answer. The honest risk: if the match-analysis work slips indefinitely, this ADR commits the project to a library it never installs — and the only currently-buildable visualisation needs no charting library at all. See "Revisit if".

## Context

The football analytics frontend needs five visualisations ([`docs/design/frontend-ui-ux.md`](../design/frontend-ui-ux.md)):

1. A player percentile comparison view — the nearest-term one (`/api/v1/players/compare` already returns real data, though the screen still needs player and season pickers that no API route serves yet)
2. A custom SVG pitch (`<Pitch>`, 105 × 68 m aspect ratio, overlay children)
3. A ball heat map / trail on that pitch (~900 points per match)
4. An xG flow chart (step line over match minutes)
5. Supporting stat tables and bars

Mantine 9 is already the UI library, and `@mantine/charts` exists — so "use what we already have" was the obvious starting hypothesis. Items 2–4 are blocked on `match_events`/`ball_positions` ingestion code that does not exist yet.

Two beliefs held before this research turned out to be **wrong**, and both were load-bearing:

- **"The 150 kB gzip CI limit leaves ~49 kB of headroom, so a charting library may not fit."** The limit is **per JS chunk**, not global. Measured on a config-matched probe replica of this app: a Recharts radar on a lazy route landed in **its own route chunk at 83.4 kB gzip, leaving the entry chunk unmoved** (100.3 → 100.5 kB). Bundle size was never the binding constraint it was assumed to be.
- **"The radar chart is the thing we need to render."** It probably is not — see [`frontend-ui-ux.md`](../design/frontend-ui-ux.md) §3.1. FBref presents percentiles as a **table**, and the encoding critique of radars is rigorous and largely uncontested. The primary comparison view is a **percentile bar strip**, which needs no charting library at all.

## Decision

**Adopt visx** (`@visx/*`) as the charting toolkit for `apps/web`.

Measured and verified 2026-08-15 (npm registry API, GitHub REST API, and a build of a **probe replica** of this app — same Vite config, bundlesize gate, tsconfig chain and monorepo depth, with a baseline matching the real build to within 0.2 kB. Trustworthy numbers, but not a build of the repo itself):

|                             | visx                                                                       | Recharts / `@mantine/charts`               |
| --------------------------- | -------------------------------------------------------------------------- | ------------------------------------------ |
| Latest release              | 4.0.0 (2026-06-11)                                                         | 3.10.1 (2026-07-25) / 9.5.1                |
| **Marginal gzip, 3 charts** | **~26 kB**                                                                 | **~121 kB**                                |
| React 19                    | ✅ explicit — "React 19 Support" (#1968), "Require React 18 or 19" (#2009) | ✅ peer range                              |
| Radar                       | Primitives (`LineRadial`, `GridRadial`, `GridAngle`) — compose it          | Built-in component                         |
| Accessibility               | **None built in**                                                          | `accessibilityLayer` — keyboard nav + ARIA |
| Licence                     | MIT                                                                        | MIT                                        |

**Why visx, given Mantine Charts is the lower-effort option:**

1. **One mental model instead of three.** The pitch and heat map need hand-rolled SVG under _any_ choice — no charting library draws a football pitch. Choosing Recharts means carrying Recharts **plus** hand-rolled SVG **plus** probably d3 scales for the overlays. visx's primitives (`scaleLinear`, `LinePath`, `Circle`) are exactly what the pitch overlays want, rendering into _our_ SVG in _our_ coordinate system.
2. **4.6× smaller.** ~95 kB gzip difference — roughly the size of the entire current entry chunk. Per-chunk CI gates would never flag 203 kB of JS to view one chart, which is a poor outcome regardless of whether a linter complains.
3. **The decision hinge resolved toward visx.** The research recommendation was explicitly conditional: Mantine Charts _if_ the pitch/heatmap work is speculative, visx _if_ it will genuinely be built. The project owner confirmed (2026-08-15) the product intent is a **full match-analysis platform** — the pitch and heat map are the destination, not a maybe.
4. **`CLAUDE.md` optimises for "genuine, transferable, current industry-standard practice", not "ship fast."** Composing a chart from scales and primitives teaches substantially more transferable data-viz skill than passing props to a wrapper.
5. **Cleanest verified React 19 story of any candidate** — an explicit release note, not an inferred peer range.

**The radar-chart argument that would have favoured Mantine Charts largely evaporated**, because we are not leading with a radar. The primary comparison view is a percentile bar strip built from plain HTML/CSS — no charting library involved. visx is being chosen for items 2–4, where the real charting work is.

## Rejected alternatives

- **`@mantine/charts` / Recharts** — see above. Genuinely the faster path to a radar, and the better accessibility default. Loses on bundle, on mental-model count once the pitch lands, and on the transferable-practice goal.
- **nivo** — last _release_ 2025-05-23 (15 months before this decision) despite recent commits, plus an open React 19 issue (#2801, key-prop warnings in legends). Fixes existing in `master` but unreleased is the specific risk.
- **Observable Plot** — **no radar or polar mark at all**, 345 open issues, last release 2025-02-14. Disqualified on capability, not just maintenance.
- **Raw D3** — smallest (`d3-scale` + `d3-shape` ≈ 9.9 kB) but its imperative DOM model fights React. visx is essentially "D3's maths with React's rendering", which is the part worth having.
- **ECharts** (367 kB full barrel, imperative API), **Chart.js** (canvas-only — the chart is an opaque bitmap to screen readers), **Victory** (last release 2025-01-14, no React 19 mention), **Tremor** (does not declare React 19; Tailwind-based, wrong UI stack), **µPlot** (canvas, no React binding, no radar), **LayerChart** (Svelte-only) — all ruled out.

## Consequences

- **We own chart _keyboard interaction_ entirely — this is the real, unmitigated cost.** An earlier draft of this ADR claimed the data-table-alongside pattern offset it. **It does not**, and the distinction matters: the research recommends that table **"regardless of choice"** — under Recharts we would get the table **plus** `accessibilityLayer` (arrow-key navigation and ARIA, on by default in Mantine's wrapper). So the table discharges **1.1.1 Non-text Content** and unlocks the **1.4.11** conformance route under either library; what visx uniquely costs us is **2.1.1 Keyboard**, and a static table provides none of it.

  That cost is concrete, not theoretical: the planned **time scrubber** for event markers and the **peer-group toggle** on Compare are interactive controls. A mouse-only scrubber is a Level A failure that no accompanying table cures. Accepted knowingly — we build keyboard interaction for any interactive visualisation ourselves. See [`frontend-ui-ux.md`](../design/frontend-ui-ux.md) §5.

- **Chart contrast has no automated safety net.** `axe-core`'s `color-contrast` rule is disabled in our jsdom tests (no layout engine), so a 1.4.11 failure would ship silently under any library. Real verification has to happen in Playwright.
- **Chart colours must be chosen by measured contrast ratio** in both colour schemes — 3:1 for graphical objects — and meaning must never be encoded by hue alone.
- **Keep charts on lazy-loaded routes.** The bundle argument depends on code-splitting; `autoCodeSplitting` is already enabled.
- **More code for the radar**, if the opt-in secondary radar view is ever built. Accepted — composing it is the transferable-practice payoff, not just a cost.
- **Nothing is installed yet.** No `@visx/*` dependency is added until the first real chart is built. (Not a claim about existing practice — `zustand` and `@tanstack/react-form` currently ship with zero consumers in `src/`, per ADR 0005. This is a constraint on _this_ decision, not a description of the repo.)
- **Reversible at low cost for item 1.** If visx proves wrong, the percentile strip does not depend on it at all, and a single chart is a contained migration. The genuine lock-in only accrues once the pitch overlays are built on visx primitives.

## Revisit if

- The match-analysis work (items 2–4) is abandoned or indefinitely deferred — at which point the justification largely collapses and Mantine Charts becomes the better answer for whatever charting remains.
- visx's release cadence stalls the way nivo's has.
