# `packages/db` as its own workspace package, and Bun's native SQL driver over Neon's serverless driver

## Status

Accepted — built. `packages/db` exists with a full Drizzle schema (all 10 tables from `PROJECT.md` §2) and an initial migration generated (`packages/db/drizzle/`). Not yet wired into `apps/api` or `apps/ingestion` (Phase 4/5), and no Neon project exists yet to run the migration against.

## Context

`PROJECT.md` §1's original monorepo diagram didn't include a database package — it only anticipated `packages/shared` (Zod schemas). Phase 2 ("Write Drizzle schema definitions matching §2") needed a real home for that schema, and two questions had to be answered before writing any code: where does the Drizzle schema/client live, and which Postgres driver connects it to Neon.

**Location.** Both `apps/api` (reads, per `PROJECT.md` §4) and `apps/ingestion` (writes, per §3) need the same schema and a DB client — the same "second real consumer" situation that justified `packages/shared` in the first place. Putting Drizzle in `packages/shared` was ruled out early: `packages/shared` is also imported by `apps/web` (browser bundle), and a DB driver has no business shipping to a browser bundle.

**Driver.** The default reach for "Drizzle + Neon" in most tutorials is `@neondatabase/serverless`, Neon's HTTP/WebSocket driver built for edge/serverless functions with no persistent TCP connection available. That's not this project's shape: `apps/api` and `apps/ingestion` both run as regular long-lived Bun processes on Render (ADR 0010), not edge functions. Checked directly against Drizzle's own docs (`docs.drizzle.team`, via Context7, 2026-08-12): "When connecting to Neon from a serverful environment, you can utilize standard PostgreSQL drivers such as `node-postgres` or `Postgres.js`" — Neon's own Postgres endpoint is standard-wire-protocol-compatible, the serverless driver exists specifically for environments without TCP access, not because it's the generally-preferred choice.

## Decision

**`packages/db`**, a new `packages/*` workspace package: Drizzle schema (`src/schema/*.ts`, one file per table, barrel-exported — same pattern as `packages/shared`, see the barrel-export feedback note) plus a `createDb(connectionString)` client factory (`src/client.ts`). Consumed by `apps/api` and `apps/ingestion` only, never `apps/web`.

**`drizzle-orm/bun-sql`** as the driver — Bun's native `SQL` client (from the `bun` module itself), not `@neondatabase/serverless`. Confirmed via Bun's own docs (`bun.sh`, via Context7) that `Bun.SQL` accepts standard `sslmode=require` connection strings, the exact format Neon issues (`postgresql://...?sslmode=require`) — no compatibility gap. This is also the only driver choice here with **zero extra runtime dependency**: `drizzle-orm/bun-sql` uses Bun's built-in module, so `packages/db`'s only dependencies are `drizzle-orm` and (dev-only) `drizzle-kit`.

Two more choices made while writing the schema, worth recording here rather than only in code comments:

- **`casing: "snake_case"`** (Drizzle's `DrizzleConfig` option, confirmed present in the installed `drizzle-orm@0.45.2` types) on both the client and `drizzle.config.ts`, so schema files use plain camelCase property names and Drizzle maps them to `snake_case` columns automatically — no per-column `text("column_name")` string duplication. This settles Phase 1's "camelCase field naming" assumption (`PROJECT.md` §10) as correct.
- **`integer().primaryKey().generatedAlwaysAsIdentity()`** for every primary key, not `serial()` — confirmed via Drizzle's docs as "the recommended alternative to serial types" (SQL-standard identity columns vs. Postgres's legacy sequence-ownership-free `serial`). This settles Phase 1's "ID types as `number().int().positive()`" assumption as correct — identity columns are still plain integers.

## What was actually built

- `packages/db/src/schema/*.ts` — all 10 tables from `PROJECT.md` §2: `competitions`, `seasons`, `teams`, `players`, `squad_memberships`, `fixtures`, `match_events`, `ball_positions`, `player_season_stats`, `ingestion_runs`.
- `UNIQUE(sportmonks_id)` on `competitions`/`teams`/`players`/`fixtures`/`seasons`/`ball_positions`, `UNIQUE(sportmonks_event_id)` on `match_events` (see "Consequences" below on the last two), `UNIQUE(player_id, team_id, season_id)` on `player_season_stats`.
- Indexes: `match_events(fixture_id)`, `match_events(fixture_id, type)`, `ball_positions(fixture_id)`, `player_season_stats(player_id, season_id)` — all four named in `PROJECT.md` §2/§11 Phase 2.
- `packages/db/src/client.ts` — `createDb(connectionString)`, typed against `BunSQLDatabase<typeof schema> & { $client: SQL }`.
- `packages/db/drizzle.config.ts` + `packages/db/drizzle/0000_*.sql` — initial migration, generated without a live DB connection (`drizzle-kit generate` only needs the schema + dialect, confirmed via Drizzle's docs).

## Consequences / known gaps, deliberately not resolved here

- **CHECK constraints on `match_events` by type** (`PROJECT.md` §2's "wide table" trade-off) are **not implemented**. That reasoning was written against the now-dropped `x`/`y`/`xg` columns (Phase 3); what would apply to the surviving `outcome`/`body_part`/`situation` columns depends on Sportmonks' real `type` enum values, which aren't confirmed anywhere in this codebase yet (`packages/shared`'s `MatchEventSchema.type` is deliberately a plain `string()` for the same reason). Revisit once Phase 4's Sportmonks API client surfaces real `type`/`sub_type_id` values — tracked in `TODO.md`.
- **Fixed in review, 2026-08-12: `squad_memberships` had no `sportmonks_id`/`UNIQUE` at all** — the same upsert-idempotency gap as the `seasons`/`ball_positions` case below, but a real one (no column, not just no constraint), so re-running ingestion would have inserted duplicate membership rows every time. `PROJECT.md` §2's "Constraints required for the upsert strategy" paragraph is now corrected to name all seven Sportmonks-sourced tables explicitly, instead of the three-table list that let this slip past review the first time.
- **No Neon project exists yet**, so the generated migration hasn't been run anywhere — that's still open (`PROJECT.md` §11 Phase 2, `TODO.md`).
- **Not wired into `apps/api`/`apps/ingestion` yet** — `createDb()` exists but nothing calls it. `DATABASE_URL` isn't in either app's `.env.example` yet (`PROJECT.md` §7); add it when the wiring lands, not before.
- **Flagged in review, 2026-08-12, not yet resolved: `createDb(connectionString)` doesn't distinguish Neon's pooled vs. direct connection strings.** Confirmed against Neon's own docs (`neon.com/docs/guides/serverless-connection-pooling`, `neon.com/docs/connect/connection-latency`, via Context7): app runtime traffic should use the pooled (`-pooler` suffix) connection string, routed through PgBouncer; migrations need the _direct_ string instead (`packages/db`'s own `drizzle.config.ts` — correct as-is, since `drizzle-kit migrate` needs direct). Neither `createDb()`'s signature nor its call sites (none exist yet) document which string to pass. Also unaddressed: Neon's Scale to Zero suspends compute after 5 minutes idle, adding a few hundred ms of cold-start latency on the next query — real for `apps/ingestion`'s every-few-hours cadence (§3), where nearly every run will hit a cold compute. No retry/reconnect handling exists. Resolve both — which string, and cold-start tolerance — before wiring `createDb()` into the apps, not after (`TODO.md`).

## Considered and rejected

- **Drizzle schema inside `apps/api`, imported by `apps/ingestion`** — rejected: apps importing from other apps (rather than from a shared package) is a monorepo smell, and it would make `apps/api` a load-bearing dependency of `apps/ingestion` for something neither app should "own" over the other.
- **`packages/shared`** — rejected: it's imported by `apps/web` for typed API responses; a Postgres driver in that dependency graph would either bloat the browser bundle or require careful dead-code-elimination that isn't worth the fragility, for zero benefit (`apps/web` never talks to Postgres directly).
- **`@neondatabase/serverless`** (`neon-http` or `neon-serverless`) — rejected per the Context research above: built for edge/serverless environments without persistent TCP, which doesn't describe this project's Render-hosted, long-running Bun processes. Would still work (Neon's HTTP endpoint is real), but it's the wrong tool for a serverful host and adds a dependency Bun's native driver doesn't need.
- **`pg` (node-postgres) or `postgres` (postgres.js)** — the drivers Drizzle's own docs do recommend for a serverful Neon connection, and a reasonable choice. Rejected only in favor of `drizzle-orm/bun-sql` because this project is Bun-first end to end (ADR 0002) and Bun ships a native, wire-protocol-compatible Postgres client — using it avoids an extra dependency for no loss of capability, confirmed via Bun's own docs that it handles Neon's `sslmode=require` connection strings directly.
