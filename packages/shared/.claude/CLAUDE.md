# packages/shared

Zod schemas + inferred types (`z.infer`) for the core domain entities: competition, season, team, player, fixture, match event, ball position, player season stats. Consumed by `apps/api` (request/response validation), `apps/ingestion` (validating normalized data before DB writes), and `apps/web` (typed API responses) — see `PROJECT.md` §1.

Root `.claude/CLAUDE.md` rules (stack, coding standards, guardrails) apply here unmodified — this file only adds what's specific to this package.

## Commands

```sh
bun run typecheck
```

No test target yet — root `test` script only filters `apps/web`.

## Structure

One file per entity under `src/schemas/`, schema + its inferred type colocated, barrel-exported from `src/index.ts`.

## Open item

Several field-shape choices (ID types, camelCase naming, ISO-string dates, enum-shaped string fields like `type`/`status`) are unconfirmed assumptions made in Phase 1 — see `PROJECT.md` §10 and the matching Phase 2 checklist item. Reconcile against the real Drizzle schema before treating them as settled.
