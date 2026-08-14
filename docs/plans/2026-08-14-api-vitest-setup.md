# apps/api Vitest setup

## Files touched + why

- `apps/api/vitest.config.ts` (new) — mirrors `apps/ingestion`/`packages/shared`: `node` env, `globals: true`, `include: ["src/**/*.test.ts"]`.
- `apps/api/package.json` — add `test`/`test:watch` scripts, `vitest`+`@types/bun` devDeps.
- `apps/api/tsconfig.json` — add `"vitest/globals"` to `types`.
- `apps/api/src/routes/build-player-compare-entries.ts` (new) — extracted pure logic from `players-compare.ts`: mid-season-transfer dedup + missing-player detection (`resolvePlayerRows`) and response-shaping + percentile calc (`buildCompareEntries`). Named row/peer types (currently anonymous, drawn from Drizzle's inferred `select()` shape).
- `apps/api/src/routes/players-compare.ts` — thinned to I/O only: fetch rows → `resolvePlayerRows` → throw 404 on missing → fetch peers → `buildCompareEntries` → return. No behavior change.
- `apps/api/src/routes/build-player-compare-entries.test.ts` (new) — percentile correctness, transfer dedup (picks max-minutes stint), missing-player detection, independent per-position peer groups, empty peer group → `null` percentile.
- `apps/api/src/middleware/error-handler.test.ts` (new) — `errorHandler`/`notFoundHandler`/`validationErrorHook` tested via Hono's own `app.request()` pattern (throwaway test apps registering a route that throws/fails validation), asserting the `{error:{code,message}}` envelope and status codes.
- `package.json` (root) — add `apps/api` to the `test` script's filter chain.
- `apps/api/.claude/skills/run-api/SKILL.md`'s "## Test" section — update from "no test suite" to the real one.

## Approach

Same split this repo already uses in `apps/ingestion` — pure logic (`normalize-*.ts`-equivalent) gets real unit tests; DB-touching I/O (`ingest-*.ts`-equivalent, here the two routes' `db.select()` calls) stays **not** unit tested, verified manually against real data instead (already done for both routes, documented in `TODO.md`). This avoids inventing a DB-mocking abstraction this project has explicitly avoided elsewhere ("No custom client wrappers exist yet"), and avoids automated tests silently querying the real `local-dev` Neon branch on every run — in the spirit of the DB-command guardrail even though this isn't literally a migration/write.

### Alternatives considered

Integration-test routes against the real `local-dev` branch (matches this project's stated preference for real data over mocks elsewhere). Rejected for now — real ingested data changes over time (new ingestion runs), making assertions on route _output_ brittle in a way normalize-*.ts's static captured fixtures aren't; and it would need `DATABASE_URL` wired into CI, a bigger, separate decision. Worth revisiting later, not blocking this.

## Test/type impact

New tests only, no existing behavior changes (route handlers keep identical external behavior — the extraction is a pure refactor, `bun run typecheck`/manual re-verification confirms no regression).

## Migration/breaking-change risk

None — internal refactor + additive test files.

## Rollback plan

Revert the PR; route files are functionally unchanged.
