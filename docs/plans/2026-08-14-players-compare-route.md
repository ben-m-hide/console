# Ingest players/player_season_stats (Premier League only) + build /players/compare

## Files touched + why

- `packages/db/src/schema/player-season-stats.ts` — drop `xa`/`xaPer90`. Real API research (scanned an entire finished-season squad, 32 players) found no "Expected Assists" stat type anywhere under this Sportmonks subscription — only "Expected Goals (xG)" exists. Same situation as `competitions.tier` (dropped 2026-08-14, no data source, no consumer), same fix.
- `packages/db/drizzle/` — new migration for the column drop, applied to the `local-dev` Neon branch (table has 0 rows, no data-loss risk).
- `packages/shared/src/schemas/player-season-stats.gen.ts` — regenerated (`bun run codegen`), loses `xa`/`xaPer90`.
- `apps/ingestion/src/sportmonks-types.ts` — raw types for player profile + statistics (`SportmonksPlayerRaw`, `SportmonksPlayerStatisticRaw`, `SportmonksStatisticDetailRaw`), plus real captured samples.
- `apps/ingestion/src/sportmonks-client.ts` — `fetchSeasonTeams(token, seasonId)` (standalone `GET /teams/seasons/{id}`, verified working — avoids re-ingesting that season's fixtures just to get its team roster), `fetchTeamSquad(token, teamId, seasonId)` (`GET /squads/seasons/{id}/teams/{id}`, gives player ids for that team+season), `fetchPlayerWithStats(token, playerId)` (`GET /players/{id}?include=nationality;position;statistics.details.type` — profile + every season's stats in one request).
- `apps/ingestion/src/ingest-teams.ts` — refactor: takes `Array<SportmonksTeamRaw>` directly instead of deriving from fixtures' `participants`, so it can source teams from either the fixtures path (current season, unchanged) or `fetchSeasonTeams` (finished season, new) without a second entity concept.
- `apps/ingestion/src/normalize-player.ts` + `ingest-players.ts` — dedupe player ids across the target season's squads, normalize (`nationality.name`, `position.name` from the combined include), upsert keyed on `sportmonksId`.
- `apps/ingestion/src/normalize-player-season-stats.ts` + `ingest-player-season-stats.ts` — read `details[]` by `type.code` (`minutes-played`, `goals`.`value.total`, `assists`.`value.total`, `expected-goals`.`value.expected`); a stat type absent from `details[]` means 0, not a throw (confirmed: Sportmonks omits zero-valued categories, e.g. a defender's profile had no "Goals" entry at all). Compute `goalsPer90`/`assistsPer90`/`xgPer90` ourselves from `minutesPlayed`. Resolve `playerId`/`teamId`/`seasonId` FKs via `Map`s, same pattern as `ingest-fixtures.ts`.
- `apps/ingestion/src/index.ts` — extend the flow: after teams/fixtures (current season, unchanged), ingest Premier League's most-recently-**finished** season's teams (via `fetchSeasonTeams`, not fixtures), then players + player_season_stats for that season only.
- `apps/api/src/routes/players-compare.ts` — `GET /api/v1/players/compare?ids=1,2,3&season=`: per requested player, compute percentile rank within the peer group (same `position`, same competition via `season.competitionId`, same `seasonId`, `minutesPlayed >= 450`) for goals/assists/xg per-90. Zod-validated query params.
- `apps/ingestion/.claude/CLAUDE.md`, root `TODO.md` — updated once done.

## Approach

**Scope: Premier League only, most-recently-finished season (`25583`, "2025/2026") for players/stats** — not all 5 competitions. Two reasons: (1) matches the "one real row before scaling" precedent every prior entity followed; (2) real volume check — one competition is ~20 teams × ~25 players ≈ 500 Sportmonks requests (squad list + one profile+stats call per player); all 5 would be 2,500+, a step up from anything done so far (teams/fixtures was ~20 requests total) with no rate-limit handling yet (separately tracked TODO). Proving the pipeline and the percentile route on one real competition first is the same discipline as competitions→seasons→teams/fixtures.

**Season for stats ≠ "current"**, unlike teams/fixtures. PL 2026/27 hasn't started (kickoff 2026-08-21) — scoping to "current" would mean ~zero real minutes played, failing the 450-minute floor for nearly every player, making `/players/compare` technically wired but practically empty. The most-recently-finished season has real, complete data (verified: `has_values: true` across the squad, real goals/assists/xG present).

**`squad_memberships` stays out of scope** — `player_season_stats` already carries `playerId`/`teamId`/`seasonId` directly; the compare route needs nothing from `squad_memberships` (roster/jersey-number tracking, a separate concern, still deferred as before).

**Percentile calc**: peer group = `player_season_stats` rows joined to `players` (same `position`) and `seasons` (same `seasonId`, same `competitionId` via the season's own FK), filtered `minutesPlayed >= 450`. Rank each requested player's goals-per-90/assists-per-90/xg-per-90 against that group. No caching/materialization — computed per-request against real (small, PL-scale) row counts.

### Alternatives considered

- Ingest all 5 competitions' finished seasons now — rejected, see volume/precedent reasoning above; a fast-follow once this slice is verified, not blocked on anything structural.
- Make `xa`/`xaPer90` nullable instead of dropping — rejected, a `NOT NULL` column turned nullable with permanently-null data (no source exists) is worse than not having the column; matches `tier`'s precedent of dropping outright.
- Derive teams for the finished season from that season's fixtures (same path as current-season teams) — rejected, would mean also ingesting a whole extra season of fixtures just to get team names, when the standalone `/teams/seasons/{id}` endpoint gives the same team data directly.

## Test/type impact

- New Vitest unit tests: `normalize-player.test.ts`, `normalize-player-season-stats.test.ts` (real captured shapes, including the "stat type absent = 0" case and the FK-missing throw cases), `ingest-teams.test.ts` impact from the signature change (existing behavior via fixtures path must still pass).
- `packages/shared`'s existing `schemas.test.ts` needs its `PlayerSeasonStats` coverage updated for the dropped fields (mirrors what happened when `Competition.tier` was removed).
- No test suite exists yet for `apps/api` — the new route is verified manually (real request against the real ingested PL data), same as `/api/v1/competitions` was. Still tracked separately (`apps/api` test setup TODO).

## Migration/breaking-change risk

Low. `player_season_stats` has 0 rows — dropping columns is not a data-loss migration. `ingest-teams.ts`'s signature change is internal to `apps/ingestion`, no external consumer.

## Rollback plan

Revert the PR. If the migration was already applied to `local-dev`, a follow-up migration re-adding the columns (nullable) would restore the shape without needing real data back — none existed to lose.
