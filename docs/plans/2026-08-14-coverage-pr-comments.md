# Test coverage reports as PR comments

## Files touched + why

- `apps/api/package.json`, `apps/ingestion/package.json`, `packages/shared/package.json` — add `@vitest/coverage-v8` (`^4.1.10`, matching `apps/web`) and a `test:coverage` script. None of these three currently have coverage wired at all.
- `apps/api/vitest.config.ts`, `apps/ingestion/vitest.config.ts`, `packages/shared/vitest.config.ts` — add `coverage: { provider: "v8", reporter: ["text", "json-summary", "json"], reportOnFailure: true }`.
- `apps/web/vite.config.ts` — its existing `coverage` block gains `reporter`/`reportOnFailure` (currently only `provider`/`exclude` — no `json-summary` output today).
- Root `package.json` — `test:coverage` expanded from `apps/web`-only to chain all 4 packages (mirrors `test`'s existing chain).
- New `.github/workflows/test-coverage.yml` — own workflow, `pull_request` trigger, `permissions: contents: read, pull-requests: write` (same reasoning as `bundle-size.yml`/`dependency-review.yml`: `ci.yml` stays `contents: read`-only).

## Approach

`davelosert/vitest-coverage-report-action` (273★, actively maintained, latest `v2.12.2` pinned to `8b157684c6a6b259b97d45e72b44242865c0f6a5`) — zero external accounts (uses `GITHUB_TOKEN` only), native multi-suite support via named steps consolidating into one PR comment. Chosen over Codecov (requires a token/OIDC signup, same external-account cost this session already hit with Neon/Render/Sentry, for a project with zero real usage to justify it).

**Deliberate deviation from the root script's `&&` chaining, inside CI only**: the workflow runs each package's `test:coverage` as its own step with `continue-on-error: true`, not the chained root script. `&&` chaining means one package's test failure would short-circuit the rest, leaving their `coverage-summary.json` stale/missing — defeating `reportOnFailure: true` + `if: always()` on the report steps (the whole point being every package's report shows regardless of a sibling's failure). The root script keeps its `&&` chain for local dev — fail-fast is the right default there, matches `test`'s existing behavior. CI and local intentionally differ, for a stated reason.

No enforcement/thresholds — matches `TODO.md`'s "visibility, not enforcement" framing; thresholds stay a separate, deferred item.

## Test/type impact

None — purely additive config, no test files change. `apps/api`/`apps/ingestion` suites need no DB/secrets already, so the new workflow needs zero new secrets.

## Migration/breaking-change risk

Low — fully additive, own workflow, doesn't touch `ci.yml`'s required status check.

## Rollback plan

Delete the workflow file, revert the 4 config/package.json diffs.

## Self-critique

`apps/ingestion`'s `ingest-*.ts`/route DB-calling files will show low/uncovered by design (this repo's documented "pure logic tested, I/O verified manually" split) — expected, not a bug. Worth a one-line comment in the workflow so a future reader doesn't mistake it for a gap.
