# packages/shared

Zod schemas + inferred types (`z.infer`) for the core domain entities: competition, season, team, player, fixture, match event, ball position, player season stats. Used by `apps/ingestion` (2026-08-14, `normalize-competition.ts` validates against `CompetitionSchema` before writing to the DB — the package's first real consumer, which is why `package.json` now has an `exports` field). Intended for `apps/api` (request/response validation) and `apps/web` (typed API responses) too — see `PROJECT.md` §1 — but neither imports it yet.

Root `.claude/CLAUDE.md` rules (stack, coding standards, guardrails) apply here unmodified — this file only adds what's specific to this package.

## Commands

```sh
bun run codegen  # regenerates src/schemas/*.gen.ts from packages/db's Drizzle tables
bun run typecheck
bun run test
```

## Structure

Schemas are **generated**, not hand-written — `scripts/generate-schemas.ts` derives each `src/schemas/<entity>.gen.ts` from the matching Drizzle table in `packages/db`, so field shape has one source of truth instead of two. Gitignored, `.gen.ts` suffix (same convention as `apps/web/src/routeTree.gen.ts`) — **never hand-edit these**. `schemas/index.ts` barrel re-exports from them. See `docs/adr/0013-generate-shared-schemas-from-drizzle.md` for the full mechanism and why `drizzle-zod` isn't used directly.

## Open item

`scripts/generate-schemas.ts`'s `OVERRIDES` table (numeric bound strictness — positive/nonnegative/unbounded — isn't derivable from a Drizzle column alone) is manually maintained. Extend it when a new entity/field needs something other than the `.nonnegative()` default; `schemas.test.ts` covers today's one known exception (`BallPosition.x`/`y`) as a regression check. (`Competition.tier` was removed 2026-08-14 — no Sportmonks data source, no downstream feature used it; see `PROJECT.md`'s correction note.)
