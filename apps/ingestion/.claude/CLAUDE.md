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

First real vertical slice: `competitions` only (2026-08-14) — `sportmonks-client.ts` (auth via `Authorization` header, `fetchLeagues()`), `normalize-competition.ts` (validates against `packages/shared`'s `CompetitionSchema.omit({ id: true })` — `id` is DB-generated, not part of the insert shape), `ingest-competitions.ts` (orchestrates fetch → normalize → upsert, per-league failure isolation so one bad league doesn't sink the run — same philosophy as the planned per-fixture transaction loop, PROJECT.md §3). Upsert is a real `onConflictDoUpdate` keyed on `sportmonksId`, verified idempotent (ran twice, still 5 rows).

**Not yet implemented** (Phase 4's fuller scope, deliberately deferred — see `TODO.md`): rate-limit handling, `ingestion_runs` audit logging, fixtures/seasons/teams/match_events/ball_positions/player_season_stats, scheduling. `.env`/`.env.example` needs `SPORTMONKS_TOKEN` and `DATABASE_URL` (pooled — see `packages/db`'s ADR 0012).

## Notes

- Validates normalized data against `packages/shared` schemas before writing to the DB — see `PROJECT.md` §1.
- Normalization logic (`normalize-competition.ts`) is Vitest-unit-tested against a real captured Sportmonks response, per `PROJECT.md` §6's guidance that this is the highest-value test target.
