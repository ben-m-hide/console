# packages/db

Drizzle schema (all 10 tables from `PROJECT.md` §2) + a `createDb(connectionString)` Postgres client, for Neon. Consumed at **runtime** by `apps/api` and `apps/ingestion` only — deliberately **not** `apps/web`, so a Postgres driver never reaches the browser bundle. See `docs/adr/0012-packages-db-and-bun-sql-driver.md` for why this is its own package and why the driver is `drizzle-orm/bun-sql` (Bun's native `SQL` client) rather than `@neondatabase/serverless`.

`packages/shared` also has a **devDependency** on this package (via `package.json`'s `exports` field, added for exactly this) — codegen-time only, to derive its Zod schemas from these tables. Never a runtime import, never reaches `apps/web`'s bundle. See `docs/adr/0013-generate-shared-schemas-from-drizzle.md`.

Root `.claude/CLAUDE.md` rules (stack, coding standards, guardrails) apply here unmodified — this file only adds what's specific to this package.

## Commands

```sh
bun run typecheck
bun run db:generate   # drizzle-kit generate — no live DB connection needed
bun run db:migrate    # drizzle-kit migrate — needs DATABASE_URL set
```

No test target yet.

## Structure

One file per table under `src/schema/`, barrel-exported from `src/schema/index.ts`, re-exported from `src/index.ts` alongside `src/client.ts`'s `createDb()`. `drizzle.config.ts` at the package root drives the CLI (`dialect: "postgresql"`, `casing: "snake_case"`).

## Open items

- `drizzle-kit`'s CLI (`db:generate`/`db:migrate`) needs a real Postgres driver package installed to connect — `postgres` (postgres.js) is a devDependency for exactly that. Independent of the app's own runtime driver (`drizzle-orm/bun-sql`, ADR 0012) — CLI tooling only, never imported by app code.
- `CHECK` constraints on `match_events` scoping `outcome`/`body_part`/`situation` by `type` are deliberately not implemented — Sportmonks' real `type` enum values aren't confirmed anywhere in this codebase yet. See the inline comment in `src/schema/match-event.ts` and ADR 0012.
- **Before wiring `createDb()` into `apps/api`/`apps/ingestion`: pass the pooled connection string (`-pooler` hostname suffix), not the direct one** — `drizzle.config.ts` uses direct (correct, migrations need it); `createDb()` needs pooled. See the comment in `src/client.ts` and ADR 0012's "Consequences" section for why (Neon's own docs, plus Scale to Zero cold-start latency on `apps/ingestion`'s every-few-hours cadence — no retry/reconnect handling exists yet either).
- Nothing calls `createDb()` yet — `apps/api`/`apps/ingestion` wiring is still open (`TODO.md`).
