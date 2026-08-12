# Software Design — Football Analytics Platform

Builds on `project-decisions.md`. This document is the implementation-level design: monorepo layout, database schema, API contract, frontend structure, and a task list to work through.

Assumes: existing boilerplate already has a Vite+React app and a basic Hono API in a monorepo. This design extends that boilerplate rather than starting from scratch.

---

## 1. Monorepo structure

```
/
├── apps/
│   ├── web/                 # existing Vite + React boilerplate
│   ├── api/                 # existing Hono boilerplate
│   └── ingestion/           # new — Bun script, scheduled on Render
├── packages/
│   └── shared/               # new — Zod schemas + inferred types, used by api/web/ingestion
├── package.json               # workspace root
├── Dockerfile                 # for apps/api (see §5)
└── .github/workflows/         # CI/CD
```

**One adjustment to the earlier plan:** since Bun is the runtime, use Bun's native workspace support (`"workspaces"` in root `package.json`, Bun's own lockfile) rather than Yarn. Yarn 4 Berry's PnP mode and Bun don't play well together, and Bun's workspace implementation covers what you need here (it speaks the same `package.json` `workspaces` field npm/Yarn use). Confirm this matches what the existing boilerplate already uses — if the boilerplate was scaffolded with Yarn already, align on Bun workspaces during Phase 0 rather than mixing tooling.

**`packages/shared` contains:**

- Zod schemas for every entity (competition, team, player, fixture, match event, stats)
- Inferred TS types from those schemas (`z.infer<typeof PlayerSchema>`)
- Used by `apps/api` for request/response validation, by `apps/ingestion` to validate normalized data before writing to the DB, and by `apps/web` for typed API responses

---

## 2. Database schema (Postgres, via Drizzle)

| Table                 | Purpose                                                                                        | Key columns                                                                                                                                                                                                                                 |
| --------------------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `competitions`        | League/competition reference data                                                              | `id`, `sportmonks_id`, `name`, `country`, `tier`                                                                                                                                                                                            |
| `seasons`             | A competition's season                                                                         | `id`, `sportmonks_id`, `competition_id` (FK), `name`, `start_date`, `end_date`, `is_current`                                                                                                                                                |
| `teams`               | Club reference data                                                                            | `id`, `sportmonks_id`, `name`, `short_name`, `logo_url`                                                                                                                                                                                     |
| `players`             | Player reference data                                                                          | `id`, `sportmonks_id`, `name`, `date_of_birth`, `nationality`, `position`                                                                                                                                                                   |
| `squad_memberships`   | Player-team-season link (handles transfers cleanly)                                            | `id`, `player_id` (FK), `team_id` (FK), `season_id` (FK), `shirt_number`, `joined_at`, `left_at` (nullable)                                                                                                                                 |
| `fixtures`            | A single match                                                                                 | `id`, `sportmonks_id`, `season_id` (FK), `home_team_id` (FK), `away_team_id` (FK), `kickoff_at`, `status`, `home_score`, `away_score`                                                                                                       |
| `match_events`        | Every pass/shot/touch/defensive action, event-level                                            | `id`, `fixture_id` (FK), `sportmonks_event_id`, `type`, `player_id` (FK), `related_player_id` (FK, nullable — e.g. pass receiver), `minute`, `outcome`, `body_part`, `situation` — **`x`/`y`/`end_x`/`end_y`/`xg` dropped, see note below** |
| `ball_positions`      | Ball-tracking points for the pitch heat map/trail, whole-match, not player- or team-attributed | `id`, `fixture_id` (FK), `sportmonks_id`, `period_id`, `timer`, `x`, `y` — see §5 note; **no team/player attribution exists in this feed**, this is a single whole-match trail, not a per-team split                                        |
| `player_season_stats` | Pre-aggregated per-player-**team**-season stats                                                | `id`, `player_id` (FK), `team_id` (FK), `season_id` (FK), `minutes_played`, `goals`, `assists`, `xg`, `xa`, plus per-90 derived fields                                                                                                      |
| `ingestion_runs`      | Audit trail for the ingestion job                                                              | `id`, `started_at`, `completed_at`, `status`, `competition_id`, `season_id`, `fixtures_processed`, `fixtures_failed`, `error_message`                                                                                                       |

**Why `match_events` is one wide table, not several:** shots, passes, and defensive actions all share the same shape (a `type`, a location, an outcome) — one table with a `type` discriminator is simpler to query for cross-type views (e.g. "everything that happened in the 60th minute") than five separate tables, and it's the natural fit for how you'll actually query it: "give me all events for fixture X" for the Match Report screen. **Trade-off, accepted deliberately:** this means most columns are nullable for any given row (a pass doesn't have `xg`, a shot doesn't have `end_x/y`), so add `CHECK` constraints per type at the DB level (e.g. `type = 'shot' → xg IS NOT NULL`) rather than relying on application code alone to keep the data honest.

**Correction, Phase 3 (2026-08-12):** the location/`xg` columns this paragraph assumes don't exist in Sportmonks' data — see the Phase 3 task list entry. Sportmonks' `Event` entity has no `x`/`y`, and `xg` lives on a separate team/player-scoped `Expected` entity, not per-shot. The "wide table, `type` discriminator, per-type `CHECK` constraints" reasoning above still holds for whatever event fields _do_ exist (outcome, body part, situation); it just no longer applies to spatial or per-shot-xG columns, which have been dropped from the table above.

**Why `player_season_stats` exists separately from computing aggregates on the fly:** the Player Comparison screen needs fast reads across potentially many players at once (radar charts, percentile rankings against positional peers). Computing that from raw `match_events` on every request means aggregating across every match a player played, every time — pre-aggregating during ingestion (or via a scheduled rebuild step) keeps that screen fast. This is a deliberate materialized-summary pattern, worth naming as such in an interview.

**Why `player_season_stats` is keyed on `(player_id, team_id, season_id)`, not `(player_id, season_id)`:** a mid-season transfer means one player has two stints in one season, at two different clubs — keying on player+season alone would either overwrite one stint's stats with the other's or silently merge them into a meaningless blend. Keying by team as well gives each stint its own row; a "season total across clubs" view, if you want one, is a derived sum over these rows, not something stored directly.

**Why `ingestion_runs` exists:** gives you a real audit trail — when did the last sync run, did it fail, on what. `fixtures_processed`/`fixtures_failed` give you partial-failure visibility (see §3) rather than a single pass/fail bit for the whole run.

**Constraints required for the upsert strategy in §3 to actually work:** `UNIQUE(sportmonks_id)` on `competitions`, `teams`, `players`, and `fixtures`; `UNIQUE(sportmonks_event_id)` on `match_events`. Without these, there's nothing for an `ON CONFLICT` upsert to target — this is a hard prerequisite, not an optimization.

**Indexes:** at minimum, `match_events(fixture_id)`, `match_events(fixture_id, type)`, and `player_season_stats(player_id, season_id)` — the first two carry almost all of the Match Report's read load, the third carries the Comparison screen's.

---

## 3. Ingestion job (`apps/ingestion`)

**Responsibility:** pull from Sportmonks on a schedule, normalize, upsert into Postgres via Drizzle. Nothing else — no business logic beyond shaping data to fit the schema.

**Flow per run:**

1. Record a new row in `ingestion_runs` (`status: running`)
2. Fetch fixtures for the target competition/season — see the "unverified assumption" note below on how this filtering actually works
3. For each fixture, **in its own transaction**: fetch events (passes, shots, defensive actions with coordinates), upsert into `match_events` keyed on `sportmonks_event_id`. If one fixture's fetch or write fails, that fixture's transaction rolls back and the run continues to the next fixture — a bad fixture shouldn't sink the whole run, and a bad run shouldn't leave a fixture half-written.
4. Recompute/upsert `player_season_stats` for affected players
5. Update `ingestion_runs` with `status: success` / `partial` / `failed`, plus `fixtures_processed` and `fixtures_failed` counts — a run where 9 of 10 fixtures succeeded is meaningfully different from total failure and should be visible as such, not collapsed into one boolean.

**Idempotency matters here:** every upsert should be keyed on the Sportmonks ID, not a blind insert — the job will run repeatedly and must be safe to re-run without creating duplicates. This depends on the `UNIQUE` constraints specified in §2.

**Resolved, Phase 3 (2026-08-12):** a delta endpoint exists — `GET /fixtures/latest` — but per Sportmonks' own docs it "returns all fixtures that have received updates within 10 seconds." That's a near-real-time polling primitive, not an arbitrary since-last-run delta: at this project's every-few-hours ingestion cadence (§3, deliberately not real-time — see the earlier decision to skip live tracking), it would miss nearly every update between runs. **Use the rolling-window fallback as the actual approach, not a contingency:** re-fetch a window (e.g. the last 14 days of fixtures) on every run, so corrections (VAR review, data-quality passes after full-time) get picked up regardless of when they land relative to a run.

**Rate limits (verified against `docs.sportmonks.com/v3/api/rate-limit`, 2026-08-11):** limits are per-**entity** (resource type — Fixture, Team, etc.), not per-endpoint, and reset 1 hour after the first request in that window (rolling, not a fixed clock hour). `GET /fixtures/123?include=participants;events;statistics` counts as **one** request regardless of how many includes are chained — use `include=` aggressively instead of separate calls per related resource; Sportmonks' own docs claim 50–80% request-volume reduction from this alone. Every successful response carries a `rate_limit` object (`remaining`, `resets_in_seconds`, `requested_entity`) — throttle proactively off that instead of only reacting to `429`s. On a `429`, honor a `retry_after` field in the response body if present, exponential backoff otherwise; a run that silently drops data because it got rate-limited partway through is worse than a run that's slower but complete. Hitting the limit on one entity doesn't block others (a `429` on `fixtures` still allows `teams` calls), which matters for how the per-fixture transaction loop in step 3 above should keep making progress rather than stalling entirely.

**Scheduling:** Render's scheduled job feature, running on an interval sensible for how "current" you need the data (e.g. every few hours during active match days, less often otherwise — doesn't need to be real-time given the earlier decision to skip live tracking).

---

## 4. API design (`apps/api`, Hono)

Server-shaped, not thin passthroughs — the API does the aggregation work so the frontend stays simple.

All routes live under `/api/v1/...`, not bare `/api/...` — versioning from day one costs nothing now and avoids a painful retrofit if the response shape ever needs a breaking change after the frontend depends on it.

| Endpoint                                        | Purpose                                                                                                                                  |
| ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /api/v1/competitions`                      | List available competitions                                                                                                              |
| `GET /api/v1/competitions/:id/fixtures?season=` | Fixture list for a competition/season                                                                                                    |
| `GET /api/v1/fixtures/:id/report`               | **Match Report data**, pre-shaped: `{ ballPositions: [...], xgFlow: [...], averagePositions: [...] }` — one call powers the whole screen |
| `GET /api/v1/players?search=&team=&position=`   | Player search/filter for the comparison screen (paginated — see below)                                                                   |
| `GET /api/v1/players/:id/stats?season=`         | Single player's season stats                                                                                                             |
| `GET /api/v1/players/compare?ids=1,2,3&season=` | **Player Comparison data**, pre-shaped for radar/percentile rendering — includes percentile rank against positional peers                |
| `GET /api/v1/teams/:id/stats?season=`           | Team-level season stats                                                                                                                  |
| `GET /api/v1/health`                            | Liveness check — see Production readiness (§9)                                                                                           |

**Validation:** every route validates query params and shapes responses using the Zod schemas from `packages/shared` — this is where `@hono/zod-validator` earns its keep.

**Why `/fixtures/:id/report` bundles shots+passes+xgFlow+positions into one response** rather than four separate endpoints: the Match Report screen needs all four to render, and one round trip beats four for a page that always shows everything together. Split them later only if a specific piece needs independent caching or refresh behaviour.

**Correction, Phase 3 (2026-08-12):** `shots` and `passes` as coordinate-bearing payloads aren't buildable — see §2/§11 Phase 3. `xgFlow` (aggregate, team/player-scoped xG over time) and lineup-derived `averagePositions` are unaffected. `shots`/`passes` are replaced by `ballPositions`, sourced from the `ball_positions` table (§2) — decided 2026-08-12, see §5. Whether this endpoint ships raw points or server-binned heat-map grid cells is left for Phase 5 (900+ raw points/match is a small enough payload that either is reasonable; binning follows the existing "aggregation happens server-side" pattern this endpoint already uses for `averagePositions`).

**CORS:** the frontend (CloudFront domain) and API (Render domain) are different origins — without explicit CORS configuration, the frontend's first request fails outright. Add `hono/cors` middleware scoped to your actual CloudFront domain, not a wildcard.

**Caching:** the underlying data only changes when the ingestion job runs (every few hours, not per-request), which makes every read endpoint here highly cacheable and currently undesigned for. Set `Cache-Control: public, max-age=...` on GET responses, matched loosely to your ingestion interval — meaningful performance for near-zero effort.

**Pagination:** `/players` search has none specified yet — fine at MVP scale, but add a `limit`/`offset` or cursor param before the player table grows large enough for an unbounded search to matter.

**Percentile baseline for `/players/compare` — needs an explicit definition, not just a bullet point:** "percentile rank against positional peers" only means something once you fix the reference population. Recommended default: same position, same competition, same season, minimum 450 minutes played (roughly 5 full matches) — small enough sample sizes make percentiles meaningless, so the minutes floor matters as much as the position/competition/season filters.

---

## 5. Frontend (`apps/web`)

**Routing (two screens):**

- `/matches/:fixtureId` — Match Report (shot map, passing network, xG flow, average positions)
- `/compare` — Player Comparison (search/select players, stat table, radar chart)

**Data fetching:** TanStack Query against the Hono API — request/response types come straight from `packages/shared`, so a backend shape change surfaces as a frontend type error immediately rather than a runtime bug.

**Visualization approach — build custom SVG pitch components, don't reach for a charting library:** your event coordinates are already normalized to a pitch scale, which makes hand-rolled SVG genuinely simple here, and it reads far better in an interview than "I imported a library." Suggested component shape:

- `<Pitch>` — renders the pitch outline, takes children as an overlay layer. **Get the viewBox aspect ratio right before drawing anything on it** — a real pitch is roughly 105m × 68m, not square. ~~Check Sportmonks' documented coordinate convention (likely normalized 0–100 on both axes regardless of true pitch shape)~~ **Confirmed, Phase 3 (2026-08-12): `~0–1` on both axes, not `0–100`** (via the `ballcoordinates` include — see §11 Phase 3) — set the SVG `viewBox` to match the real ratio (e.g. `0 0 1 0.64`), not a naive `0 0 1 1` — otherwise every visualization built on top renders a stretched or squashed pitch.
- ~~`<ShotMap events={shots} />` — circles sized by `xg`, colored by outcome~~ **Dead, Phase 3 (2026-08-12):** no per-event shot coordinates or per-shot `xg` exist in Sportmonks' data — see §2/§11 Phase 3. Not buildable as designed.
- ~~`<PassNetwork averagePositions={...} passEdges={...} />` — renders the pre-computed average positions and pass volumes returned by `/fixtures/:id/report` (§4)~~ **Pass edges dead, same reason.** Average positions (lineup-derived, not event-coordinate-derived) are unaffected if kept as a standalone view rather than a pass network.
- **Decided, 2026-08-12: `<BallHeatmap positions={ballPositions} />` (or `<BallTrail>` for a time-scrubbed path view) replaces `<ShotMap>`/`<PassNetwork>`**, rendering `ball_positions` (§2) on `<Pitch>`. **Correction to the earlier framing:** this is a single whole-match trail, not a per-team split — the `ballcoordinates` feed carries no team or player attribution (confirmed field list: `id`, `fixture_id`, `period_id`, `timer`, `x`, `y`), so there's no `team="home"` filter available on the data itself. A home/away split would require inferring possession from event data separately (untested, likely coarse at best given the minute-level granularity established in §11 Phase 3) — out of scope unless picked up later; default to one whole-match view. **Also explicitly out of scope: predictive/betting use cases** (e.g. "likely to score based on ball position") — that's a modeling layer this project isn't building, not a data-availability gap; don't let it re-enter scope by way of Sportmonks' own marketing copy for the feature.
- `<XgFlowChart data={xgFlow} />` — this one _is_ a reasonable place for a charting library (Recharts, already available) since it's a standard line/area chart, not a pitch overlay
- `<RadarChart data={comparisonStats} />` — Recharts also covers this well

**Styling library:** not yet decided — open task below. Options: Tailwind, Chakra (what you already use at work), or a lighter custom approach. Worth a deliberate choice given this is a portfolio piece where visual identity matters, rather than defaulting silently.

---

## 6. Testing

- **`apps/ingestion`**: Vitest, unit-testing the normalization logic specifically (raw Sportmonks response → DB row shape) — this is the highest-value place for tests since it's pure data transformation, easy to test, and where bugs are costly (bad data silently entering the DB).
- **`apps/api`**: Vitest for route handlers — validation behaviour, correct aggregation logic for the `/report` and `/compare` endpoints.
- **`apps/web`**: Playwright for the two main user flows (view a match report, compare two players) — end-to-end coverage of the things that actually matter to a demo.

---

## 7. Environment & secrets

- `.env.example` committed at each app root documenting required vars (never commit actual `.env` files)
- Required vars: `SPORTMONKS_API_KEY`, `DATABASE_URL` (Neon connection string), plus per-app API base URLs
- Local dev: point `DATABASE_URL` at a Neon **branch** created for local development — avoids needing a local Postgres install or Docker for day-to-day coding, and keeps local data isolated from anything else

---

## 8. Git & CI/CD

**Branching:** solo project — `main` stays deployable, feature branches merge in via PR (even solo, PRs give you a clean diff view and a natural point to run CI before merging).

**`.gitignore` essentials:** `node_modules`, `.env`, `.env.local`, `dist/`, `build/` — commit the Bun lockfile.

**CI (GitHub Actions), on every PR:** typecheck, lint, run Vitest suites across `apps/api` and `apps/ingestion`, run Playwright against a preview build.

**CD, on merge to `main`:**

- `apps/api` → build Docker image → **run `drizzle-kit migrate` against production** → deploy to Render. The migration step has to happen as part of the pipeline, not manually and separately — a forgotten manual migration is the single most common way a deploy silently breaks.
- `apps/web` → build → sync to S3 → CloudFront invalidation
- `apps/ingestion` → deploy alongside `apps/api` as a Render scheduled job (same Docker image, different entrypoint/command, or a separate small service — decide during Phase 5 based on how different the runtime needs actually turn out to be)

**Correction on hosting cost:** the earlier plan described Render's ingestion scheduling as free. Checking this properly turned up conflicting claims — some sources describe cron jobs as free-tier-included, but the more specific and current ones say cron jobs bill separately, starting around $1/month on a paid plan tier. The API web service itself does have a genuine, working free tier; the scheduled ingestion job likely doesn't. Net effect: budget a few dollars a month, not $0, for the full stack — small, but worth knowing precisely rather than being surprised by a charge.

---

## 9. Production readiness

Right-sized for a solo portfolio project — not enterprise SRE, but the habits of a properly run small system rather than a throwaway script. A few of these also carry real interview value as evidence of judgment, not just code output.

**Health check endpoint.** `GET /api/v1/health` returning a simple `{ status: "ok", lastIngestionAt: ... }`. Cheap to build, and it's the thing any uptime monitor or Render health check needs to exist anyway.

**Consistent error handling.** Every failed request should return the same error envelope shape (`{ error: { code, message } }`), not ad-hoc error bodies per route. Add a single error-handling middleware in Hono rather than try/catching individually in every handler.

**Basic rate limiting on the public API.** It's read-only against your own cached data, so the risk is small, but a lightweight limiter (`hono-rate-limiter` or similar) on the public endpoints is a cheap guard against someone hammering `/players/compare` and eating your Render/Neon usage.

**Dependency hygiene.** Enable Dependabot (GitHub-native, zero setup cost) on the repo. A portfolio project with a year-old, unpatched dependency tree undercuts the "production grade" story more than almost anything else on this list.

**Graceful frontend states.** Every data-driven component needs an explicit loading state, error state, and empty state — not just a happy path. A null `xg` on an older or lower-coverage fixture shouldn't crash `<ShotMap>`; it should just render without that circle.

**Data licensing — a real compliance point, not a formality.** Sportmonks' terms allow you to store and distribute the data itself, but explicitly prohibit reselling it, and separately require you to source your own rights for any **team logos or player photos** — those are owned by the leagues/clubs, not licensed to you through Sportmonks merely by having API access. This isn't hypothetical: it's a documented reason apps have been rejected from app stores for displaying league-sourced crests without separate authorization. _Mitigation:_ don't display official team logos or player photos. Use text, initials, or generic placeholder icons instead — you lose nothing analytically, and it removes a real legal exposure from a project you'll be linking publicly in job applications.

**Backup posture.** Neon's free tier includes a 6-hour point-in-time recovery window at no charge — good enough here for one specific reason: `match_events` and reference data aren't primary records, they're a cache of Sportmonks' data. Worst case, a corrupted table can be wiped and re-populated by re-running ingestion against the same Sportmonks IDs, rather than being genuinely, irrecoverably lost the way user-generated data would be. Worth knowing you have this fallback, not worth building a separate backup system for.

**README.** Genuinely load-bearing for a portfolio piece, not just good practice — it's likely the first thing anyone reviewing this project actually reads. Cover: what it does, architecture overview (the diagram from this design works well here), how to run it locally, how it's deployed, and what you'd build next (the parked roadmap items from `project-decisions.md`).

---

## 10. Open decisions (deliberately left for build time)

- Frontend styling approach (Tailwind vs Chakra vs custom)
- Exact ingestion schedule interval
- Whether `apps/ingestion` deploys as its own Render service or a scheduled command within `apps/api`'s image

---

## 11. Task list

### Phase 0 — Repo alignment

- [x] Confirm workspace tooling: align root `package.json` on Bun workspaces (adjust if boilerplate already assumes Yarn) — done, root `package.json` uses Bun's native `workspaces` field (`apps/*`, `packages/*`)
- [x] Scaffold `apps/ingestion` and `packages/shared` directories — done, both have `package.json`/`tsconfig.json`; contents are still stubs (`export {}` / a placeholder log), real implementation is Phase 1/4
- [x] Set up shared TS config / lint config referenced by all apps — done, root `tsconfig.json` references both packages, `bun run typecheck`/`lint` pass clean across the workspace

### Phase 1 — Shared schemas

- [ ] Define Zod schemas in `packages/shared` for: competition, season, team, player, fixture, match event, ball position, player season stats
- [ ] Export inferred types alongside each schema

### Phase 2 — Database

- [ ] Create Neon project + a local-dev branch
- [ ] Write Drizzle schema definitions matching §2, including `UNIQUE` constraints on all `sportmonks_id`/`sportmonks_event_id` columns and the `CHECK` constraints on `match_events` by type
- [ ] Add indexes: `match_events(fixture_id)`, `match_events(fixture_id, type)`, `ball_positions(fixture_id)`, `player_season_stats(player_id, season_id)`
- [ ] Generate and run initial migration
- [ ] Seed a small manual dataset (1–2 fixtures worth) for early development before ingestion is built

### Phase 3 — Sportmonks trial verification

- [x] Sign up for Sportmonks 14-day trial
- [x] Confirm event-coordinate data (`location_x/y`, `pass_end_x/y`) is returned for your target leagues on the plan tier you intend to pay for — **negative, verified 2026-08-12.** Read the live `Event` entity schema directly (not just the tutorial pages): it carries no `x`/`y`/`location_x`/`location_y` fields, on any include. Confirmed against two real fixtures. Per-shot `xg` is the same story — `Expected` is a separate entity (`{ data: { value }, location: home|away, type }`) scoped to team/player, not attached to individual shot events. **Net effect: no per-event shot or pass coordinates, and no per-shot xG, from this API at all** — not a tier restriction, the data model doesn't carry it. §2's `match_events.x/y/end_x/end_y/xg` columns and §5's `<ShotMap>`/`<PassNetwork>` are not buildable as designed; see the note on both sections.
- [x] Confirm which plan/add-on is required for xG — verified against `sportmonks.com/football-api/plans-pricing/` (2026-08-11): xG & Pressure Index is a separate add-on (€29/mo, €24/mo billed yearly) on top of a base plan, not bundled into any tier by default. Going with Starter (€29/mo, 5 leagues, 2,000 calls/entity/hour) + the add-on, ~~€58/mo (~~€48/mo yearly). Still unconfirmed: whether the 14-day trial covers the add-on itself, not just the base plan.
- [x] Confirm whether a delta/"updated since" fixture-fetch capability exists — **exists but not usable at this project's cadence, verified 2026-08-12 against `docs.sportmonks.com`**: `GET /fixtures/latest` returns fixtures updated in the last 10 seconds only — a live-polling primitive, not a since-last-run delta. Rolling-window re-fetch (§3) is the actual approach, not a fallback for a missing feature.
- [x] Confirm Pressure Index's field-level schema (time granularity, location scoping) — **verified 2026-08-12 against `docs.sportmonks.com`**: `pressure` include returns `{ id, fixture_id, participant_id, minute, pressure }`, team-scoped (`participant_id`, not per-player), minute-level granularity — same resolution as `Event`, same tradeoff as the timestamp-join note above (fine for a minute-bucketed momentum overlay alongside the time scrubber in §5, not for spatial correlation). No location field at all, so it can't sharpen ball-position data spatially either way.
- [x] Confirm Sportmonks' documented pitch coordinate convention (aspect ratio, normalization range) before building any SVG pitch component against it — **confirmed 2026-08-12, but not from the field originally targeted.** No shot/pass event carries coordinates (see above). Instead, the `ballcoordinates` include (note: lowercase in the actual JSON response, unlike the camelCase `include=` param — tripped up an early query against this) returns dense **ball-position tracking**, not tied to any `player_id`: `{ id, fixture_id, period_id, timer, x, y }`, hundreds of points per match (936 on the one fixture pulled). `x`/`y` observed in the `~0–1` range, not `0–100` as guessed. **Bounds confirmed 2026-08-12 across all 936 points on the sampled fixture:** `x` ∈ `[0.02, 0.96]`, `y` ∈ `[-0.02, 1.02]` — x stays inside the nominal pitch, y slightly overshoots both ends (tracking noise near the touchline, or the ball genuinely out of play). Pad the `<Pitch>` viewBox slightly rather than clipping hard at exactly `0`/`1`. This is team/ball-level, not per-player — it does not give a per-player touch map, only a whole-match ball trajectory or heat map. **Decided 2026-08-12: build against it** — see §2/§5.

**Considered and ruled out, 2026-08-12: joining `ballcoordinates` to `Event` by timestamp to reconstruct approximate shot/pass locations.** Structurally sound idea (asof join between two time series), but `Event`'s full field list (`addition`, `coach_id`, `detailed_period_id`, `extra_minute`, `fixture_id`, `id`, `info`, `injured`, `minute`, `on_bench`, `participant_id`, `period_id`, `player_id`, `player_name`, `related_player_id`, `related_player_name`, `rescinded`, `result`, `section`, `sort_order`, `sub_type_id`, `type_id` — confirmed via a live fixture, not assumed) has no seconds-level or timestamp field; `minute` (integer) is the finest clock reference. `ballcoordinates` samples roughly every 4–6s, so a `minute`-tagged event has ~10 candidate ball positions in its 60s window with nothing to disambiguate which one is real — a player can cover the pitch length in that time. `period_id` matches between the two feeds (confirmed), so period-level alignment works; sub-minute alignment doesn't. Any pick from the window would be a heuristic guess presented as data, not a reconstruction — not worth building. **This only rules out spatial reconstruction** (placing an event at a specific pitch coordinate it was never measured at). **Temporal cross-referencing remains open and doesn't have this problem:** showing event markers on a time scrubber alongside the `<BallTrail>` view (§5) — "the ball was here during the minute this shot happened" — invents no coordinates and needs only `minute`/`period_id` alignment, which is confirmed to work.

### Phase 4 — Ingestion job

- [ ] Build Sportmonks API client (typed, using `packages/shared` schemas to validate responses). Base URL `https://api.sportmonks.com/api/v3/football/...`; authenticate via the `Authorization` header, not the `?api_token=` query param — same rate limit either way, but a query-param token is far more likely to leak into logs/proxies/browser history than a header. Docs also explicitly warn never to expose the token to a frontend; not a risk here since `apps/ingestion` calls Sportmonks server-side only.
- [ ] Write normalization functions: Sportmonks response shape → internal schema shape
- [ ] Write upsert logic (fixtures, match_events, `ball_positions`, keyed on Sportmonks IDs), wrapped per-fixture in a transaction — `ball_positions` is high-volume (~900+ rows/fixture), batch the insert rather than row-at-a-time
- [ ] Add rate-limit handling to the Sportmonks client: track the `rate_limit` object (`remaining`/`resets_in_seconds`/`requested_entity`) from each response to throttle proactively per-entity, and on `429` honor `retry_after` if present or exponential backoff otherwise (see §3 for specifics)
- [ ] Use `include=` to combine related-resource fetches into single requests rather than separate calls per entity (§3) — the main lever for staying inside the hourly budget
- [ ] Write `player_season_stats` aggregation step (keyed on player+team+season, not player+season)
- [ ] Wire up `ingestion_runs` audit logging, including `fixtures_processed`/`fixtures_failed`
- [ ] Unit test normalization logic (Vitest)
- [ ] Integration test: recorded sample Sportmonks payload → run ingestion → assert the final `/report` response shape end-to-end
- [ ] Manually trigger a run against one real competition/season, verify data lands correctly

### Phase 5 — API layer

- [ ] Namespace all routes under `/api/v1`
- [ ] Implement `/health`
- [ ] Implement `/competitions`, `/competitions/:id/fixtures`
- [ ] Implement `/fixtures/:id/report`
- [ ] Implement `/players`, `/players/:id/stats` (with pagination on `/players`)
- [ ] Implement `/players/compare`, using the explicit percentile baseline definition from §9 (position + competition + season + minutes floor)
- [ ] Implement `/teams/:id/stats`
- [ ] Add Zod request/response validation on all routes
- [ ] Add `hono/cors` middleware scoped to the CloudFront domain
- [ ] Add `Cache-Control` headers on GET routes
- [ ] Add a shared error-handling middleware with a consistent error envelope
- [ ] Add basic rate limiting on public endpoints
- [ ] Unit test route handlers (Vitest)

### Phase 6 — Frontend

- [ ] Decide styling approach (see §10)
- [ ] Set up TanStack Query + typed API client using `packages/shared`
- [ ] Build `<Pitch>` base component, viewBox matched to the real pitch aspect ratio confirmed in Phase 3
- [ ] Build `<BallHeatmap>` (and/or `<BallTrail>`) overlay component, rendering `ballPositions` from `/report` (§4/§5) — not computing aggregates client-side if the endpoint ships pre-binned data
- [ ] Build Match Report page, wire to `/api/v1/fixtures/:id/report`
- [ ] Build player search/select UI
- [ ] Build `<RadarChart>` and stat table for comparison
- [ ] Build Player Comparison page, wire to `/api/v1/players/compare`
- [ ] Add loading/error/empty states to every data-driven component
- [ ] Confirm no team logos or player photos are displayed without separately verified licensing (see §9) — use text/initials instead
- [ ] Playwright tests for both flows

### Phase 7 — Deployment

- [ ] Write Dockerfile for `apps/api`
- [ ] Decide `apps/ingestion` deployment shape (own service vs scheduled command), confirm actual Render cron pricing before committing
- [ ] Set up Render service(s) + scheduled job
- [ ] Set up S3 bucket + CloudFront distribution for `apps/web`
- [ ] Configure GitHub Actions: CI on PR, CD on merge to `main`, including `drizzle-kit migrate` as an explicit pipeline step
- [ ] Set production env vars in Render (Sportmonks key, Neon connection string)
- [ ] Enable Dependabot on the repo
- [ ] Write the README (overview, architecture diagram, local setup, deployment, roadmap)
- [ ] End-to-end smoke test against the deployed stack
