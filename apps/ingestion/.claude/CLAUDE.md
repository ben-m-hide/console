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

Two entities so far: `competitions` (2026-08-14) and `seasons` (2026-08-14). Shared shape per entity — a fetcher in `sportmonks-client.ts`, a `normalize-<entity>.ts`, an `ingest-<entity>.ts` orchestrator (fetch → normalize → upsert, per-item failure isolation so one bad row doesn't sink the run — same philosophy as the planned per-fixture transaction loop, PROJECT.md §3). `sportmonks-client.ts`'s fetch/error-handling boilerplate is now extracted into a shared `fetchSportmonks<T>()` helper — done once `fetchSeasons` gave it a second real consumer, not before (see `TODO.md`'s BACKLOG note on this exact trigger).

`seasons.competitionId` is an FK — `ingest-seasons.ts` resolves Sportmonks' `league_id` to our internal `competitions.id` via a `Map` built by querying already-ingested competitions first (so `ingestCompetitions` must run before `ingestSeasons` — `index.ts` runs them sequentially, not in parallel). `fetchSeasons` also fetches all target leagues' seasons in one call (`filters=leagueIds:a,b,c`), not one call per league.

Both upserts are real `onConflictDoUpdate`s keyed on `sportmonksId`, verified idempotent (ran twice, row counts unchanged both times: 5 competitions, 15 seasons).

**Not yet implemented** (Phase 4's fuller scope, deliberately deferred — see `TODO.md`): rate-limit handling, `ingestion_runs` audit logging, teams/players/squad_memberships/fixtures/match_events/ball_positions/player_season_stats, scheduling. `.env`/`.env.example` needs `SPORTMONKS_TOKEN` and `DATABASE_URL` (pooled — see `packages/db`'s ADR 0012).

## Notes

- Validates normalized data against `packages/shared` schemas before writing to the DB — see `PROJECT.md` §1.
- Normalization logic (`normalize-competition.ts`) is Vitest-unit-tested against a real captured Sportmonks response, per `PROJECT.md` §6's guidance that this is the highest-value test target.
