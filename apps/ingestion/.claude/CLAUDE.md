# apps/ingestion

Scheduled Bun job: pull from Sportmonks, normalize, upsert into Postgres via Drizzle. See `PROJECT.md` §3 (design) and §11 Phase 4 (task list).

Root `.claude/CLAUDE.md` rules (stack, coding standards, guardrails) apply here unmodified — this file only adds what's specific to this package.

## Commands

```sh
bun run dev        # watch mode, src/index.ts
bun run typecheck
bun run test        # normalization unit tests
```

`src/index.ts` also runs directly (`bun run src/index.ts`) for a one-off manual trigger, not just via `dev`'s watch mode.

## Structure

Six entities so far: `competitions` and `seasons` (2026-08-14), `teams` and `fixtures` (2026-08-14), then `players` and `player_season_stats` (2026-08-14). Shared shape per entity — a fetcher in `sportmonks-client.ts`, a `normalize-<entity>.ts`, an `ingest-<entity>.ts` orchestrator (fetch → normalize → upsert, per-item failure isolation so one bad row doesn't sink the run — same philosophy as the planned per-fixture transaction loop, PROJECT.md §3). `sportmonks-client.ts`'s fetch/error-handling boilerplate is now extracted into a shared `fetchSportmonks<T>()` helper — done once `fetchSeasons` gave it a second real consumer, not before (see `TODO.md`'s BACKLOG note on this exact trigger). Real captured sample data for tests lives in `sportmonks-fixtures.ts`, not `sportmonks-types.ts` (types only there) — see `docs/conventions/typescript.md`'s "Test fixtures don't live in a types file".

`seasons.competitionId` is an FK — `ingest-seasons.ts` resolves Sportmonks' `league_id` to our internal `competitions.id` via a `Map` built by querying already-ingested competitions first (so `ingestCompetitions` must run before `ingestSeasons` — `index.ts` runs them sequentially, not in parallel). `fetchSeasons` also fetches all target leagues' seasons in one call (`filters=leagueIds:a,b,c`), not one call per league.

`ingest-teams.ts` takes `Array<SportmonksTeamRaw>` directly (not fixtures) — teams have no single dedicated source. For the **current** season (`seasons.isCurrent = true`, 5 seasons, `index.ts`'s first pass, not a historical backfill — see `TODO.md`'s BACKLOG item), teams come from `fetchSeasonFixtures(token, seasonId)`'s (`GET /seasons/{id}?include=fixtures.participants;fixtures.scores;fixtures.state`) embedded `participants` — one request gets fixtures, teams, scores, and match state together. For the **finished** season players/stats need (below), teams come from the standalone `fetchSeasonTeams(token, seasonId)` (`GET /teams/seasons/{id}`) instead, since that season's fixtures aren't otherwise needed. `ingest-fixtures.ts` resolves `seasonId`/`homeTeamId`/`awayTeamId` FKs the same `Map`-from-already-ingested-rows way `ingest-seasons.ts` does, so `ingestTeams` must run before `ingestFixtures`. Score extraction reads the `scores` entry with `type_id` `SPORTMONKS_CURRENT_SCORE_TYPE_ID` (1525, verified against `/core/types` — not guessed), `null` when a fixture hasn't been played yet (empty `scores` array).

`players`/`player_season_stats` are scoped to `PLAYER_STATS_COMPETITION_NAMES` (`index.ts`) — Premier League, Bundesliga, La Liga, Community Shield, each competition's most-recently-**finished** season (not current). "Club Friendlies 1" deliberately excluded — 97 teams for one season (vs. 18-20 for a real league), needing more Player-entity requests than Sportmonks' 2,000/hour budget on its own, and low value for `/players/compare` anyway (friendly-match stats aren't a real competitive peer group); see `TODO.md`'s BACKLOG item. Both the per-player fetch loop and the outer per-competition loop have real per-item/per-competition failure isolation (`try`/`catch`, matching this file's other `ingest-*.ts` isolation) — added after a real run hit a live `429` mid-competition and, without isolation, silently discarded that competition's already-fetched progress _and_ skipped every subsequent competition. `fetchTeamSquad(token, teamId, seasonId)` (`GET /squads/seasons/{id}/teams/{id}`) gives player ids per team; `fetchPlayerWithStats(token, playerId)` (`GET /players/{id}?include=nationality;position;statistics.details.type`) gets one player's profile and every season's stats in one request. `normalize-player-season-stats.ts` reads `details[]` by `type.code` (`SPORTMONKS_STAT_CODE`) — an absent stat type means zero, not missing data (Sportmonks omits zero-valued categories entirely; verified against a real defender's profile with no "Goals"/"Assists" entries at all). `xa`/`xaPer90` (Expected Assists) aren't modeled — no such stat type exists anywhere under this subscription (searched an entire finished-season squad), same reasoning as `competitions.tier`'s removal. `ingest-player-season-stats.ts` handles a player having two rows for the same season (a mid-season transfer) as two separate upserts, keyed on the schema's own `unique(playerId, teamId, seasonId)`.

All six upserts are real `onConflictDoUpdate`s keyed on `sportmonksId`, verified idempotent for competitions/seasons/teams/fixtures (ran twice against the real API + `local-dev` branch, identical counts both times: 5 competitions, 15 seasons, 134/149 teams, 1,163/1,178 fixtures — the 15 team/fixture failures cascade from the same root cause, a handful of minor-club friendly opponents Sportmonks has no `short_code` for) and verified once for players/stats (20 finished-season teams, 698/718 players, 714/734 stats — the 20 failures cascade from academy/youth-squad players Sportmonks has no `nationality` for).

**Not yet implemented** (Phase 4's fuller scope, deliberately deferred — see `TODO.md`): rate-limit handling (beyond the isolation fix above — no backoff/retry/proactive throttling off Sportmonks' `rate_limit` object yet), `ingestion_runs` audit logging, `squad_memberships`/`match_events`/`ball_positions`, scheduling, historical-season backfill (teams/fixtures beyond current, "Club Friendlies 1" players/stats). `.env`/`.env.example` needs `SPORTMONKS_TOKEN` and `DATABASE_URL` (pooled — see `packages/db`'s ADR 0012).

## Notes

- Validates normalized data against `packages/shared` schemas before writing to the DB — see `PROJECT.md` §1.
- Normalization logic (`normalize-competition.ts`) is Vitest-unit-tested against a real captured Sportmonks response, per `PROJECT.md` §6's guidance that this is the highest-value test target.
