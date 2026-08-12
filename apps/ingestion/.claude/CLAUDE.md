# apps/ingestion

Scheduled Bun job: pull from Sportmonks, normalize, upsert into Postgres via Drizzle. See `PROJECT.md` §3 (design) and §11 Phase 4 (task list) — no implementation yet, `src/index.ts` is a placeholder log line only.

Root `.claude/CLAUDE.md` rules (stack, coding standards, guardrails) apply here unmodified — this file only adds what's specific to this package.

## Commands

```sh
bun run dev        # watch mode, src/index.ts
bun run typecheck
```

## Notes

- Validates normalized data against `packages/shared` schemas before writing to the DB (once Phase 4 lands) — see `PROJECT.md` §1.
- No test setup yet — Phase 4 should add Vitest unit tests for the normalization logic specifically (raw Sportmonks response → DB row shape), per `PROJECT.md` §6.
