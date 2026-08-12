# packages/db

Drizzle schema (all 10 tables from `PROJECT.md` §2) + a `createDb(connectionString)` Postgres client, for Neon. Consumed by `apps/api` and `apps/ingestion` only — deliberately **not** `apps/web`, so a Postgres driver never reaches the browser bundle. See `docs/adr/0012-packages-db-and-bun-sql-driver.md` for why this is its own package and why the driver is `drizzle-orm/bun-sql` (Bun's native `SQL` client) rather than `@neondatabase/serverless`.

Root `.claude/CLAUDE.md` rules (stack, coding standards, guardrails) apply here unmodified — this file only adds what's specific to this package.

## Commands

```sh
bun run typecheck
bun run db:generate   # drizzle-kit generate — no live DB connection needed
bun run db:migrate    # drizzle-kit migrate — needs DATABASE_URL set
```

No test target yet — same as `packages/shared`.

## Structure

One file per table under `src/schema/`, barrel-exported from `src/schema/index.ts`, re-exported from `src/index.ts` alongside `src/client.ts`'s `createDb()`. `drizzle.config.ts` at the package root drives the CLI (`dialect: "postgresql"`, `casing: "snake_case"`).

## Open items

- No Neon project exists yet — the generated migration (`drizzle/0000_*.sql`) hasn't run anywhere.
- `CHECK` constraints on `match_events` scoping `outcome`/`body_part`/`situation` by `type` are deliberately not implemented — Sportmonks' real `type` enum values aren't confirmed anywhere in this codebase yet. See the inline comment in `src/schema/match-event.ts` and ADR 0012.
- `UNIQUE(sportmonks_id)` on `seasons` and `ball_positions` goes beyond what `PROJECT.md` §2's constraints paragraph literally lists — treated as a gap in that paragraph, not a deliberate exclusion. See the inline comments in those schema files.
- Nothing calls `createDb()` yet — `apps/api`/`apps/ingestion` wiring is still open (`TODO.md`).
