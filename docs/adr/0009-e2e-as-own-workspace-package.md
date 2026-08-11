# E2E tests as their own workspace package, not inside the frontend

## Status

Accepted — `packages/e2e` scaffolded with one real Playwright Test suite (`tests/smoke.spec.ts`), verified passing via `bunx playwright test`, using Playwright's own `webServer` config to manage the dev server's lifecycle.

## Context

`playwright` had already landed as a root `devDependency` (see ADR 0008's Consequences and the `run-console` Claude Code skill) purely to drive a one-off screenshot script for that skill. Once real E2E tests became the actual goal — not just an agent-tooling driver — where they should live became a real question, not a foregone one.

## Decision

**`packages/e2e`, a third Bun workspace package**, over keeping E2E tests inside the root frontend package (where the just-added `playwright` dependency already was).

E2E tests, unlike unit tests, don't naturally belong to one package: a real user flow will exercise the frontend and (once it does anything real) the backend together. Attaching them to the root package the way `-index-page.test.tsx`-style unit tests are attached to `src/` would misrepresent that scope, and would keep Playwright's heavy dependency (browser binaries, ~270MB, downloaded separately from `bun install`) bundled into the same package.json as the actual shipped app — the same reasoning that justified splitting `packages/api` out from the root in the first place (ADR 0008).

## What was actually built

- `packages/e2e/package.json` — `@console-next/e2e`, `@playwright/test` pinned exactly (same reasoning as every other new/large dependency surface in this project: no `bun audit` allowlist safety net). Note this is `@playwright/test` (the test runner), not the bare `playwright` automation library the root package briefly held — the runner is the correct dependency once real tests, not a one-off driver script, are the point.
- `packages/e2e/playwright.config.ts` — `webServer: { command: "bun run dev", cwd: <repo root>, url: "http://localhost:5173", reuseExistingServer: !process.env.CI }`. This **replaces** a hand-rolled background-launch + poll + port-kill bash sequence entirely — confirmed empirically: `bunx playwright test` alone starts Vite, waits for it, runs the test, and shuts the dev server down afterward with no manual process management.
- `packages/e2e/tests/smoke.spec.ts` — navigates to `/`, asserts the real "console-next" heading and "It works" button render, screenshots, asserts zero browser console errors.
- `packages/e2e/tsconfig.json`, referenced from the root `tsconfig.json` — same reasoning as `infra/`/`packages/api/`: otherwise `tsc -b --noEmit` silently skips it.
- The `run-console` Claude Code skill (`.claude/skills/run-console/SKILL.md`) was rewritten to point at this real suite instead of its original bespoke `driver.mjs`, which is deleted — one real E2E setup serves both purposes instead of two parallel ones.

## Consequences / known gaps, deliberately not resolved here

- **Still only one smoke test.** `smoke.spec.ts` proves the scaffold renders; it isn't a real E2E suite covering an actual user flow, because no real interactive feature exists yet (see ADR 0008's "no first real feature/domain chosen" gap, and the `run-console` skill's own Gotchas). Revisit once one does.
- **The backend isn't exercised by anything in `packages/e2e` yet.** The stated reason for a separate package — E2E naturally spans frontend and backend — is currently aspirational; today's one spec only touches the frontend. Worth revisiting once the API has a real route the frontend actually calls, at which point a cross-package E2E test becomes the thing this ADR's reasoning was actually for.
- **Fair critique from review: a third workspace package plus a formal ADR, for one smoke test, sits in real tension with this project's own "Simplicity first" rule** (`.claude/CLAUDE.md`) — the line above admitting the justification is "currently aspirational" is exactly the kind of thing that rule asks "does this need to exist yet?" about. Recorded as a real tension, not dismissed: this was a discussed, deliberate call (not unrequested scaffolding — see `TODO.md`'s DONE entry for the confirmation trail), made on the bet that the eventual shape is worth having now rather than restructuring again later, the same bet already made explicitly once this session for pulling the Playwright dependency forward. Whether that bet was right depends on whether a second, cross-package E2E test actually materializes soon — if it doesn't, this ADR is the evidence the bet was wrong.

## Considered and rejected

- **Keep E2E inside the root frontend package** (where `playwright` briefly lived) — rejected: misrepresents scope (E2E isn't frontend-only in intent) and couples the shipped app's dependency tree to test-only tooling with a large, separate binary download.
- **Keep it inside `packages/api`** — never seriously considered; wrong scope in the other direction, and the current test doesn't touch the backend at all.
