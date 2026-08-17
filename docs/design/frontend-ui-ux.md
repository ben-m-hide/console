# Frontend UI/UX design — `apps/web`

Screens, navigation, states, and visual language for the football analytics console. Sibling to [`frontend-architecture.md`](./frontend-architecture.md), which organises the code that implements this — **this document owns the feature decomposition; that one references it rather than restating it.**

Product intent, as stated by the project owner (2026-08-15): a **full match-analysis platform** and a **browsable football data explorer**. Priority order for how it gets built: **depth first** (one thing done properly), then breadth, then demo value. That ordering is load-bearing throughout this document — it is why the screen list is large but the build order is strictly sequential.

---

## 1. Feature decomposition

Seven screens. The **Blocked on** column is the honest constraint, not a guess — it reflects what data actually exists in the `local-dev` Neon branch and what ingestion code actually exists in `apps/ingestion`.

> **The player numbers are narrower than they look.** 1,991 players span all four real competitions, but **percentile stats (714 rows) are Premier League only, its most-recently-finished season** — peer pools of ~113 attackers and ~117 midfielders. The other three competitions have players ingested but the header scope selector will offer seasons with **no player-stat data behind them**, and the 10 non-current ingested seasons have no fixtures or teams at all. §3.1 insists on stating the baseline near the data; this table has to hold itself to the same rule.

| #   | Screen             | Route                          | Data today                                          | API route                                        | Blocked on                                                                     |
| --- | ------------------ | ------------------------------ | --------------------------------------------------- | ------------------------------------------------ | ------------------------------------------------------------------------------ |
| 1   | Dashboard          | `/`                            | ✅                                                  | ❌ needs summary + leaders                       | Nothing structural — one new API route                                         |
| 2   | Players            | `/players`                     | ⚠️ 1,991 players — most competitions, PL-only stats | ✅ `/api/v1/players` (paginated)                 | **✅ Shipped 2026-08-17**                                                      |
| 3   | Player detail      | `/players/$playerId`           | ⚠️ 714 stat rows — **PL only**                      | ❌ needs detail + stats                          | Nothing structural — one new API route                                         |
| 4   | Compare            | `/compare`                     | ✅                                                  | ✅ `/api/v1/players/compare` + `/api/v1/seasons` | Nothing — **the player and season pickers this needed both landed 2026-08-16** |
| 5   | Competitions       | `/competitions`                | ✅ 5 rows                                           | ✅ `/api/v1/competitions`                        | **Nothing — partially built**                                                  |
| 6   | Competition detail | `/competitions/$competitionId` | ✅ ~1,163 fixtures (current seasons)                | ❌ needs fixtures route                          | Nothing structural — one new API route                                         |
| 7   | Match report       | `/fixtures/$fixtureId`         | ❌ `match_events`, `ball_positions` empty           | ❌                                               | **Ingestion code that does not exist yet**                                     |

**Team detail is deliberately not a screen.** `squad_memberships` is empty and has no ingestion code, so a team page would be a name plus a fixture list. Teams appear as a **filter on Players** and as labels on fixtures. Revisit when `squad_memberships` has real data — at which point a squad roster makes it a real page.

### The API gap this design surfaced

**The API had exactly three routes when this document was written** — `/api/v1/health`, `/api/v1/competitions`, `/api/v1/players/compare`. Two of the gaps below are now closed: `GET /api/v1/players` (paginated) and `GET /api/v1/seasons` landed 2026-08-16, so the Players screen and the header scope selector are both unblocked. `/players/:id/stats` is still missing, so Player detail remains blocked.

An earlier draft of this document called Compare "buildable today" because its endpoint exists. **That was wrong at the time** — Compare needs a user to supply player IDs and a season, and until 2026-08-16 there was no `/players` route for a player picker and no seasons endpoint at all. **Both gaps are now closed**: `GET /api/v1/players` and `GET /api/v1/seasons` landed, `PROJECT.md` §4's table was updated to match, and the header scope selector (§2.1) is unblocked along with Compare.

Net, as of 2026-08-16: **Players and Compare are both frontend-only work now.** Player detail, Dashboard, Competition detail, and Match report still need their own API routes first — that remains the real sequencing constraint for the rest of the build order.

### Build order

Sequential and complete, per depth-first priority — each screen ships with its states, accessibility, and tests before the next begins. API routes are listed as the prerequisites they are.

1. ~~**API: `/players` (paginated) + a seasons route** → **Players** screen. The discovery path everything else hangs off.~~ **✅ Shipped 2026-08-17** — `/players` route, search/position filters (debounced search, `Select`), pagination, all four states (loading/error/empty/success), tested via the real route tree.
2. **API: `/players/:id` + `/players/:id/stats`** → **Player detail**. Introduces the percentile card component. Still open.
3. **Compare** — reuses the percentile card and now has real pickers feeding it (`/players` for the player picker, `/seasons` for the season picker — both closed by step 1). Its endpoint already exists, so this step is frontend-only.
4. **API: dashboard summary + leaders** → **Dashboard**, replacing the placeholder index.
5. **API: `/competitions/:id/fixtures`** → **Competitions** → **Competition detail**. The explorer branch.
6. **Ingestion: `match_events` + `ball_positions`**, then **API: `/fixtures/:id/report`** → **Match report**. Much the largest step — an unbuilt ingestion pipeline before any UI work starts.

**The backend leads, not the frontend.** Step 6 in particular is gated on ingestion code that does not exist. This is a sequencing fact to plan around, not a problem to design away.

---

## 2. Navigation and information architecture

### Shell

Mantine `AppShell` — verified to emit real `header`/`nav`/`main`/`aside`/`footer` landmarks, matching the W3C landmark mapping, so semantic structure comes free.

```
┌─ header ─────────────────────────────────────────────┐
│ console-next        [season/competition scope]  [◐]  │
├─ navbar ─┬─ main ────────────────────────────────────┤
│ Dashboard│  breadcrumbs (conditional — see §2.3)     │
│ Players  │  <h1>                                     │
│ Compare  │  content                                  │
│ Competi… │                                           │
└──────────┴───────────────────────────────────────────┘
```

Four top-level items. Well inside the range where a persistent sidebar is the right call for a data-heavy app, and far below the point where grouping becomes necessary.

Responsive collapse via `navbar={{ width, breakpoint, collapsed: { mobile, desktop } }}` — Mantine owns the layout, **we own the `opened` state**.

### 2.1 Scope selector

Competition and season scope lives in the **header**, not in each screen's own filter UI. Players, Compare, and the Dashboard all need the same scoping, and duplicating it three times invites them to drift out of sync.

Scope is held in **URL search params**, not a client store — see [`frontend-architecture.md`](./frontend-architecture.md) §3. It must survive a page reload and a shared link; a `?season=` in a pasted URL is a feature, not an implementation detail.

### 2.2 What we deliberately do not build

**No user menu.** There is no authentication in this project, so a user menu is a control that lies about what the app does. A **theme toggle alone** goes in the header. Revisit if auth ever lands.

### 2.3 Breadcrumbs — conditional, not global

Breadcrumbs earn their place on the deep branch only:

```
Competitions › Premier League › Arsenal v Chelsea
```

They are **not** shown on Players → Player detail. That branch is two levels deep with an unambiguous parent, where a breadcrumb repeats what the nav already says.

Mantine's `Breadcrumbs` renders a plain `<div>` with announced `/` separators — no `<nav>`, no `<ol>`, no `aria-current`. **The W3C-compliant breadcrumb is ours to build** (see §5).

---

## 3. Screen designs

### 3.1 Compare — `/compare`

The project's most distinctive screen. Build-order **step 3** — its endpoint already exists, but it needs the player and season pickers from steps 1–2 before a user can actually drive it.

**The primary visualisation is a percentile bar strip, not a radar chart.** This is a deliberate reversal of the assumption in `PROJECT.md` §5 and warrants its reasoning in full, because the radar is the football-analytics convention:

- **FBref — the largest public football stats site — presents percentile scouting reports as a table**, not a radar: three columns, `Statistic | Per 90 | Percentile`, grouped into labelled blocks. (Read via Wayback Machine snapshots dated 2024-12-13/2024-12-21; fbref.com returns HTTP 403 to automated fetching. Reflects the site as of that date.)
- **The encoding critique is rigorous and largely uncontested.** _Radar Plots Must Die_ (PyMC Labs, May 2026) renders the **same eight percentiles under nine different spoke orderings, producing nine different shapes** — spoke adjacency reads as meaningful but is an arbitrary authoring choice. It also names area distortion (polygon area grows quadratically with radius) and the difficulty of comparing spokes on opposite sides of the circle.
- **Independently corroborated by general perception research.** NN/g: "2D position and length are the two preattentive attributes that can be naturally mapped onto quantity." Area and angle are not among them. The football-specific critique and the general literature agree.
- **The strongest defence concedes the encoding point.** Ted Knutson, who introduced radars to football in 2014, defends them as communication rather than accuracy — "Radars start a conversation" — with his own caveat, "provided you correct for their flaws and educate your users."

So: **percentile bar strip primary** — one row per metric, name left, bar extending to the percentile, per-90 value alongside exactly as FBref does. Permuting rows changes nothing; there is no area term; each row is independently readable as a labelled value.

**Radar available as an opt-in secondary view.** Knutson's recognisability argument is real for a domain audience. If shown, the metric order is **fixed and documented**, grouped by domain, so adjacency at least encodes something.

**Peer group is a toggle, not a fixed choice.** FBref shows the same player against two pools — Saka against "Att Mid / Wingers" _and_ "Midfielders" — and the numbers move materially between them. Where a player qualifies for more than one pool, expose the switch rather than silently picking one.

**State the baseline in one sentence, near the data.** FBref's phrasing is the model: _"Player compared to positional peers in Men's Big 5 Leagues, UCL, UEL over the last 365 days. Based on 3593 minutes played."_ Position, competitions, window, sample size. A percentile without its baseline is meaningless, and ours is a narrower pool than a reader will assume.

Two methodology traps to check against our own API before building:

- **Lower-is-better metrics must be inverted** before ranking (FBref does this for goalkeeper goals-allowed). Our current metrics — goals, assists, xG per 90 — are all higher-is-better, so this does not bite yet; it will if a defensive or goalkeeping metric is added.
- **Being _ranked_ and being _in the baseline pool_ are separate qualifications.** Our API applies a single 450-minute floor. Whether that is the right model, or whether the two thresholds should differ, is an open question for the API rather than the UI.

### 3.2 Players — `/players`

Paginated, filterable list. The discovery path into Compare and Player detail.

- Pagination and filters in **URL search params** — bookmarkable, shareable, and the source of truth.
- Competition/season come from the header scope (§2.1).
- Multi-select feeds directly into Compare rather than making the user re-pick players there.
- `Table` is presentational in Mantine — **sortable and selectable behaviour is ours to build**, driven through Router search params rather than component state.

Football stat tables get wide. Column density, a sticky header, and mobile behaviour need deciding per-table rather than globally; see §5 for the sticky-header focus hazard.

### 3.3 Player detail — `/players/$playerId`

Identity block, season-by-season stats, and the player's own percentile card.

**This screen and Compare share the percentile card component.** A single-player percentile view _is_ Compare with `n=1`. Sharing the component is right; merging the screens is not — their jobs differ (one is "tell me about this player", the other "put these players side by side"), and their URLs should differ too.

Mantine's `DataList` (verified to render a real `<dl>`) fits the identity/metadata block.

### 3.4 Dashboard — `/`

Replaces the current placeholder. Everything here is buildable from existing data:

- **Coverage summary** — competitions, players, seasons actually ingested. Sets honest expectations rather than implying more data than we have.
- **Leaders** — top performers by xG/90, goals, assists, using the same percentile machinery as Compare.
- **Direct entry into Compare.**
- **Recent finished fixtures.**

### 3.5 Competitions and Competition detail

The explorer branch. Competitions lists what we have; competition detail shows seasons and fixtures, and is the route to a match report.

**Known thinness, accepted deliberately:** competitions is 5 rows, one of which is "Club Friendlies 1" (already excluded from stats ingestion). Under a pure buildable-value reading this page barely justifies itself. It is in scope because the product intent is an explorer, and because master/detail is a pattern worth building properly. That is a legitimate reason — it is recorded here so nobody later mistakes it for an oversight.

### 3.6 Match report — `/fixtures/$fixtureId` (blocked)

The destination of the match-analysis vision, and **the only screen blocked on work that does not exist**: `match_events` and `ball_positions` have no ingestion code at all.

**Three deliberate divergences from `PROJECT.md`, flagged rather than silent:**

1. **Route path `/fixtures/$fixtureId`, not `PROJECT.md` §5's `/matches/:fixtureId`.** Renamed to match the API (`/fixtures/:id/report`) and the `fixtures` table, so one entity has one name across all three layers. `PROJECT.md` should be updated to match.
2. **`viewBox="0 0 105 68"`, not `PROJECT.md` §5's `0 0 1 0.64`.** ⚠️ **This makes a scale transform mandatory, and getting it wrong is silent.** Sportmonks ball coordinates arrive **normalised ~0–1 on both axes** (a Phase 3 verified finding). Plotting raw `x`/`y` into a 105 × 68 viewBox crams all 900 points into the top-left 1 × 1 corner — no error, just a wrong-looking pitch. **Every overlay must scale by 105/68** (`scaleLinear` domain `[0,1]` → range `[0,105]` / `[0,68]`). Real-world units were chosen over the 0–1 space because pitch markings (penalty area 16.5 m, centre circle radius 9.15 m) are specified in metres, and expressing them as 0–1 fractions makes every constant unreadable. The alternative — keep `0 0 1 0.647619` and scale the _markings_ instead — is equally valid; this picks one and states the consequence.
3. **`averagePositions` retained, not dropped.** `PROJECT.md` §4 defines `/fixtures/:id/report` as returning `{ ballPositions, xgFlow, averagePositions }`, and §5 explicitly keeps lineup-derived average positions alive after `<ShotMap>`/`<PassNetwork>` were killed. An earlier draft of this section omitted it with no note — that was an oversight, not a decision. It renders as a second `<Pitch>` overlay.

Components:

- `<Pitch>` — SVG base layer, children as overlays, aspect ratio 105 × 68 m (0.647619). A naive `0 0 1 1` renders a square pitch and distorts everything drawn on it.
- `<BallHeatmap>` / `<BallTrail>` — whole-match, **not** per-team. The `ballcoordinates` feed carries no team or player attribution, so a home/away split is not available from the data.
- `<AveragePositions>` — lineup-derived, overlaid on the same `<Pitch>`.
- **xG flow** — step line over match minutes.
- Event markers on a time scrubber alongside the trail. Sub-minute spatial reconstruction is **ruled out** (`PROJECT.md` §11 Phase 3): events carry only integer `minute`, ball coordinates sample every 4–6 s, so placing an event at a coordinate would be a guess presented as data. The scrubber is an **interactive control and must be keyboard-operable** (§5.2).

**Prefer binning to rendering raw points.** ≈ 20 × 13 = 260 grid or hexbin cells carries the same information with _fewer_ marks than the raw data, and produces a summarised table rather than a 900-row one (see §5.1). Whether the endpoint ships raw points or server-binned cells is **an open API question**, not settled here — `PROJECT.md` §5 leaves it to Phase 5, and the answer should follow this screen's needs rather than being defaulted to raw.

**`[UNVERIFIED]`: ~900 SVG marks is believed comfortable — no Canvas or WebGL.** The supporting benchmarks are vendor/SEO content rather than rigorous sources, and no benchmark was run against this app. What degrades first at high mark counts is _interaction_, which is exactly what the planned time scrubber exercises. **Resolving action:** a ~30-minute spike rendering 900 `<circle>` elements on the real pitch, with the scrubber, before committing to raw points.

---

## 4. Visual language

Mantine 9 theming, extended with tokens. Both colour schemes must be correct — `defaultColorScheme="auto"` is already set.

- **`primaryShade: { light, dark }`** — per-scheme shade selection, so one palette serves both without a second theme.
- **`theme.other`** — our semantic and data-viz tokens.
- **`light-dark()` / the `@mixin dark`** for scheme-conditional values. ⚠️ **`light-dark()` does not work on `:root`/`html`** — use the `light-root`/`dark-root` mixins there. This is a real trap for us specifically, because `:root` is exactly where a design-token layer naturally wants to live.
- **`respectReducedMotion`** — on.

### 4.1 Identity without logos or photos

The data provider's terms forbid displaying team crests and player photos. Mantine's `Avatar` has purpose-built support for this — `name`, `color="initials"`, `allowedInitialsColors` — so **initials are a supported path, not a workaround**. Identity is carried by initials plus full name text.

**Do not use real club colours.** Two independent reasons: the contrast requirement in §5 means many real club colours will not clear 3:1 against our backgrounds; and whether the provider's contract constrains colours as well as logos is **unverified** — nobody on this project has read the contract itself. A contrast-chosen palette sidesteps both.

> **Action for the project owner:** read the actual Sportmonks terms and confirm what they say about club colours, not just logos and photos. This document infers the constraint from the known logo/photo rule; that inference is not evidence.

### 4.2 Data-visualisation palette

Chosen by **measured contrast ratio in both schemes**, never by hue alone. Constraints in §5. Carbon's data-viz palettes are a credible accessible reference, though its specific values have not been verified against our backgrounds.

**Never encode meaning by hue alone** — pair colour with shape, position, direct labels, or pattern. This is a hard requirement, not a preference: it serves colour-blind users and is also what makes a chart legible when printed or screenshotted.

### 4.3 Locale, dates and numbers

A UK-based project rendering European football across competitions in several timezones. Stating the policy now costs a paragraph; retrofitting it is the expensive version.

- **`en-GB` throughout. No runtime i18n framework** — one locale, no translation need. Revisit only if a second locale becomes real.
- **Kickoff times render in the viewer's local timezone, always with an explicit timezone label.** `fixtures.kickoffAt` is `timestamp with time zone`, so UTC is preserved end to end; the ambiguity is purely a display choice. A UK user looking at a La Liga fixture must not have to guess whether `20:00` is Madrid or London — **this is the classic silent bug in football apps**, and it is invisible in testing from a single timezone. Venue-local is the plausible alternative and is deliberately rejected: viewer-local answers "can I watch this?", which is the actual question.
- **Format via `Intl.DateTimeFormat` / `Intl.NumberFormat`**, not hand-rolled string building.
- **Per-90 values to 2 decimal places, percentiles as whole numbers.** `en-GB` gives a decimal point, not a comma — worth stating because a European football audience may expect otherwise, and consistency matters more than matching any one reader's habit.
- **Export is not in scope yet.** §4.2 requires the palette to survive printing and screenshotting, which is a low-cost property to preserve — but no print stylesheet, PDF or CSV export is designed. "Export this comparison" is a reasonable expectation for an analytics tool; flagged as a real gap rather than silently omitted.

---

## 5. Accessibility

Requirements the stack will not catch for us, and which drive real design decisions.

### 5.1 WCAG 1.4.11 Non-text Contrast applies to chart marks — 3:1

The spec is explicit that chart elements are graphical objects; its own worked example is pie slices. That lands on **every visualisation planned**: pitch markings, heat-map bands, xG flow line, radar series, percentile bars.

This is compounded twice:

1. **`axe-core`'s `color-contrast` rule is disabled** in our Vitest/jsdom setup — jsdom has no layout engine. **Nothing automated will catch a contrast failure.** It has to be right by design.
2. **We are adopting visx** ([ADR 0015](../adr/0015-visx-for-charting.md)), which provides **no built-in accessibility**. Everything below is ours to build.

**The spec grants an escape, and we take it deliberately:** 1.4.11 does not apply where "a graphic with text embedded or overlaid conveys the same information, such as labels and values on a chart", or where "the information is available in another form, such as in a table that follows the graph".

> **Every visualisation ships with an accompanying data table.** Text inside a graphic still owes 4.5:1 under 1.4.3.

**Directly-labelled marks, where the mark count permits.** An earlier draft made this unconditional, which does not survive contact with §3.6's ~900-point ball trail — 900 labels is not a design, and a 900-row table is not an accessibility affordance. Two rules instead:

- **Prefer aggregating over rendering raw.** Bin ball positions into a grid or hexbin (≈ 20 × 13 = 260 cells). An aggregated heat map has _fewer_ marks than the raw data, and the table that accompanies it is summarised, not per-point.
- **Where many marks genuinely must render**, they go inside **one labelled `<figure>` with `aria-hidden="true"` on the marks** — not hundreds of focusable nodes.

The percentile bar strip is doubly right by this standard: strongest encoding, and natively table-shaped.

### 5.2 WCAG 2.1.1 Keyboard — the cost visx actually imposes

Distinct from the above, and easy to conflate with it. The data table discharges **1.1.1** and unlocks the **1.4.11** escape — but the research recommends that table **regardless of charting library**, so it is _not_ what offsets visx. What visx uniquely costs us is that **every interactive visualisation needs its keyboard interaction built by hand** (Recharts would have supplied `accessibilityLayer`).

Two planned controls make this concrete, not theoretical:

- the **time scrubber** for event markers on the match report (§3.6)
- the **peer-group toggle** on Compare (§3.1)

A mouse-only scrubber is a **Level A** failure, and no accompanying table cures it. Any interactive visualisation must be operable by keyboard, with a visible focus indicator, before it ships.

### 5.3 SPA route-change focus and announcement — nothing in our stack does this

Browsers give no page-change feedback in a single-page app, Mantine has no opinion on routing, and no focus-management mechanism was found in TanStack Router's documentation.

The pattern, from Gatsby × Fable Tech Labs testing with real screen-reader, magnification and voice-navigation users:

1. Set `document.title` on route change.
2. **Move focus to the new page's `<h1>`** (`tabIndex={-1}`) — _not_ a wrapper ("very subtle compared to focusing on a heading"), _not_ the top of the app ("would be very overwhelming").
3. Keep the focus ring **visible** on that heading — it materially helps magnification and voice users.
4. Maintain a **polite live region** (`role="status"`) for route changes and loading-state changes. This also closes the gap that `Skeleton` and `LoadingOverlay` carry **zero ARIA**.
5. `aria-current="page"` on the active nav item and breadcrumb leaf.

### 5.4 Other requirements that bite

- **2.4.11 Focus Not Obscured** — a live hazard here, because we plan a fixed `AppShell` header _and_ `Table stickyHeader`. Both can cover a focused row during tabbing. Remedy: `scroll-padding`, plus `Table`'s `stickyHeaderOffset` set to the header height or the table header sticks _underneath_ the app header.
- **2.5.8 Target Size (24 × 24 px)** — check pagination controls, sort headers, icon buttons, dense stat rows. The Spacing exception applies where targets have adequate margin.
- **Contrast floor is 4.5:1 for effectively all our text.** The 3:1 large-text allowance needs ≥ 24 px (or ≥ 18.66 px bold) — display headings only. The spec also warns that anti-aliasing renders thin fonts fainter than their nominal colour, which is **directly relevant to Geist Variable at light weights**.
- **Ours to build**, because Mantine doesn't provide them: `aria-current` on nav (`NavLink` sets `data-active` only), a W3C-compliant breadcrumb, `<nav aria-label>` around `Pagination`, sortable table headers as real `<button>`s inside `<th>` with `aria-sort`, and a skip link to `<main>`.
- **`Alert` defaults to `role="alert"`** (assertive) — override to `"status"` for anything non-urgent.

---

## 6. States

Every data-driven screen defines all four. This is a completion criterion, not a polish pass — a screen without them is not done.

- **Loading** — skeletons over spinners for content-shaped waits. Skeletons carry no ARIA, so pair with the live region (§5.3).
- **Empty** — Mantine's `EmptyState` is a real first-class v9 component (`title`, `description`, `icon`, `.Actions`). Say what would fill the space and offer the action that gets there.
- **Error** — what failed, and a way to retry. The shipped index page already does this; it degrades to a visible error when the API is down (verified by killing the API mid-session). **A 429 from the rate limiter is a distinct case** and must not render as a generic failure — see [`frontend-architecture.md`](./frontend-architecture.md) §3 gotcha #10.
- **Not found** — a fifth state, genuinely distinct from empty, and **mandatory here rather than optional**. Three routes take an ID param (`$playerId`, `$competitionId`, `$fixtureId`), and CloudFront rewrites both 403 and 404 to `/index.html` at HTTP **200** (`infra/lib/hosting-stack.ts`, ADR 0007) — so a deep link to a deleted or invented ID _reaches the app_, and only the app can tell the user it does not exist.
- **Success.**

Empty is not always an edge case here. Two normal outcomes need real explanations rather than a blank card:

- a player below the 450-minute floor has **no percentile ranking**
- a scope selection with **no ingested player-stat data behind it** — see §1's caveat, this is the common case for three of the four competitions

---

## 7. Open questions

1. **Can the API return the peer distribution, not just the rank?** If so, grouped percentile ridges become viable — they show whether a 90th-percentile gap is genuinely extreme or nominal, which a bare rank compresses away. Needs an API change; unknown feasibility.
2. **Should the ranking floor and the baseline-pool floor differ?** FBref maintains two. We have one (450 minutes). An API question, not a UI one.
3. **How wide is too wide for the players table**, and does mobile get a card layout instead of horizontal scroll? Deferred to building it.
4. **Does the provider's contract constrain club colours?** See §4.1 — needs the owner to read the actual terms.
