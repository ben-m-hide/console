# Generate `packages/shared`'s Zod schemas from `packages/db`'s Drizzle tables

## Status

Accepted — built. All 8 entities that have both a Zod and a Drizzle schema (`Team`, `Competition`, `Fixture`, `Season`, `Player`, `MatchEvent`, `BallPosition`, `PlayerSeasonStats`) are now generated. `squad_memberships`/`ingestion_runs` (Drizzle-only, no current JSON-boundary need) are out of scope — see Consequences.

## Context

`packages/shared/src/schemas/*.ts` (Zod validation schemas) and `packages/db/src/schema/*.ts` (Drizzle table definitions) independently hand-declared the same fields for every entity — e.g. `TeamSchema` and `teams` both separately listed `id`, `sportmonksId`, `name`, `shortName`, `logoUrl`. `PROJECT.md` §11 Phase 2 records a manual field-by-field reconciliation between the two done by hand on 2026-08-12 — real evidence the duplication already cost real effort once, not a hypothetical risk.

Surfaced by an architecture review (`/improve-codebase-architecture`) as the top recommendation, then worked through a `/grilling` design session before any code was written.

## Decision

**Drizzle is canonical; Zod schemas are generated from it**, via a custom dev-time codegen script (`packages/shared/scripts/generate-schemas.ts`), not `drizzle-zod`.

**Why not `drizzle-zod`** (the obvious off-the-shelf choice): confirmed hands-on that `createSelectSchema(table)` returns a real Zod class-instance tree built from the table object at call time — there's no serialize-back-to-source-text capability, so using it inside a shipped file would mean `packages/shared` importing `packages/db` (and therefore `drizzle-orm/pg-core`) at runtime. That's real, non-tree-shakeable weight in `apps/web`'s browser bundle, reopening exactly the separation ADR 0012 built `packages/db` to avoid. The custom script instead introspects Drizzle's column metadata (`getTableColumns`, the same primitive `drizzle-zod` uses internally) at codegen time only, and prints literal Zod source text with a single `zod` import — `packages/shared`'s shipped code never touches Drizzle.

**What's structurally derivable from Drizzle alone**: base type (`PgInteger`→`z.number().int()`, `PgText`→`z.string()`, `PgDoublePrecision`→`z.number()`, `PgBoolean`→`z.boolean()`, `PgDateString`→`z.iso.date()`), nullability (`notNull: false` → `.nullable()`), and identity/`*Id`-suffixed columns as `.positive()`.

**What isn't derivable — confirmed empirically, not assumed**: numeric bound strictness (positive vs. nonnegative vs. unbounded) has no structural signal in a plain SQL column. Across all 8 entities, every non-identity numeric field turned out `.nonnegative()` (goal counts, minutes, xG, etc.) except two real exceptions: `Competition.tier` (`.positive()` — a tier of 0 is meaningless) and `BallPosition.x`/`y` (unbounded — pitch coordinates can be negative). The script defaults to `.nonnegative()` and carries a small, entity-scoped `OVERRIDES` table for these two named exceptions — a 3-line table, not a second full schema.

**Timestamps stay cross-layer, deliberately**: `Fixture.kickoffAt` is `timestamp({withTimezone: true})` in Drizzle (no `mode` set, so Drizzle's own default `Date` typing is untouched) but generates as `z.iso.datetime()` in Zod via a fixed codegen rule, not a Drizzle column change. Forcing Drizzle to `mode: 'string'` just to simplify codegen would have bent the DB/query layer's natural representation for the generator's convenience — the wrong direction, given `PROJECT.md`'s Phase 2 note already settled that ISO-string Zod dates and Drizzle's DB-native date handling are "different layers, not a conflict."

**Wiring**: `bun run codegen` (root script, extended alongside `apps/web`'s existing `tsr generate` call) runs before `typecheck`/`build`, matching the `routeTree.gen.ts` precedent exactly. Output uses the same `.gen.ts` suffix convention, gitignored, so a generated file is never mistaken for hand-written.

**Package graph consequence**: `packages/shared` gains `@console-next/db` and `drizzle-orm` as **devDependencies only** (codegen-time), never `dependencies`. Neither `packages/db` nor `packages/shared` previously had a `package.json` `exports` field — nothing had ever actually imported either by package name before this (both were unwired scaffolds per ADR 0012's "not yet wired into `apps/api`/`apps/ingestion`" status). Added `exports` to `packages/db` (`.` → `src/index.ts`, `./schema` → `src/schema/index.ts`) as a necessary, in-scope fix — the codegen script is the first real consumer.

## What was actually built

- `packages/shared/scripts/generate-schemas.ts` — the mapper described above.
- `packages/shared/src/schemas/*.gen.ts` — 8 generated files, gitignored; `schemas/index.ts` barrel re-exports from them.
- `packages/db/package.json` — added `exports` field.
- `packages/shared/package.json` — added `codegen`/`test`/`test:watch` scripts, `@console-next/db`/`drizzle-orm` devDependencies, `vitest` devDependency.
- Root `package.json` — `codegen`/`typecheck`/`test` extended to include `packages/shared`.
- `packages/shared/vitest.config.ts` + `packages/shared/src/schemas/schemas.test.ts` — first real tests for `packages/shared` (previously zero), covering the happy path, the two numeric-bound overrides, and nullability.

## Consequences / known gaps, deliberately not resolved here

- **`squad_memberships`/`ingestion_runs` stay Drizzle-only.** Nothing currently validates them at a JSON boundary, so generating unused Zod schemas would be scope creep in the other direction. Noted as a possible future item if either ever needs boundary validation — tracked in `TODO.md`'s BACKLOG.
- **The `OVERRIDES` table is manually maintained** and must be extended by hand whenever a new entity introduces a numeric field that isn't simply `.nonnegative()`. This is the one place duplication-by-omission could reappear — a missing override silently defaults to `.nonnegative()`, which is wrong but not unsafe (fails closed: rejects valid negative values rather than accepting invalid ones), and `schemas.test.ts` locks in today's one known exception (`BallPosition.x`/`y`) so a regression there would be caught. (`Competition.tier` was a second exception until 2026-08-14, when the column itself was dropped — no Sportmonks data source, no downstream consumer — see `PROJECT.md`'s Phase 4 correction note.)
- **Resolved 2026-08-14: `packages/shared` gained a `package.json` `exports` field** — `apps/ingestion` became its first real consumer (`normalize-competition.ts` imports `CompetitionSchema`), the exact trigger this item was waiting for, just via `apps/ingestion` rather than the `apps/web` originally guessed here.

## Considered and rejected

- **`drizzle-zod` at runtime inside `packages/shared`** — rejected: real, non-tree-shakeable bundle weight in `apps/web`, reopening ADR 0012's separation. See Decision above.
- **Zod as canonical, generate Drizzle from it** — no credible tooling exists for this direction; Drizzle needs strictly more metadata (column types, indexes, constraints, primary keys) than a Zod schema naturally encodes.
- **Drop generation, add a drift-detection test instead** (assert the two hand-written schemas' field sets stay in sync) — a real, cheaper fallback that was seriously considered. Rejected because it only improves locality (catches drift after the fact) rather than depth (removing the duplication as a single source of truth) — a smaller win than what the architecture review's top recommendation was chosen for.
