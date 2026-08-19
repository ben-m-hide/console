---
name: run-web
description: Build, run, and screenshot the console-next frontend (the Vite/React SPA in apps/web). Use when asked to start the console, take a screenshot of its UI, or verify it renders.
---

Driven via the real Playwright Test suite in `packages/e2e/` — not a bespoke script. Playwright's own `webServer` config starts the Vite dev server, waits for it to be ready, runs the test, and shuts the server down afterward; there's no manual background-launch/poll/kill needed.

This is `apps/web` — its own Bun workspace package (see `docs/adr/0011-apps-and-packages-workspace-restructure.md`; it used to be the root package, see `docs/adr/0008-hono-rest-openapi-backend.md` for the original reasoning that ADR 0011 supersedes). A sibling `run-api` skill inside `apps/api/.claude/skills/` covers the backend. `packages/e2e/` is a third workspace package, holding only the Playwright Test suite (see `docs/adr/0009` for why it's separate rather than living alongside the app it tests).

## Prerequisites / Setup

```bash
bun install
bunx playwright install chromium   # one-time; downloads to ~/Library/Caches/ms-playwright (or the Linux equivalent), not into the repo
```

## Build

None. `bun run dev` (invoked by Playwright's `webServer` config, run from the repo root — it delegates to `apps/web` via Bun's `--filter`) serves the frontend directly.

## Run (agent path)

```bash
cd packages/e2e
bunx playwright test
```

That's the whole thing — `playwright.config.ts`'s `webServer` handles start/wait/stop. `tests/smoke.spec.ts` stubs the competitions API response, navigates to `/`, waits for the real "Competitions" heading and a rendered competition row (not a fixed sleep), screenshots to `/tmp/console-next-screenshot.png`, and fails if the browser console logged an error.

## Run (human path)

`bun run dev` (from the repo root), open `http://localhost:5173`, Ctrl-C to stop.

## Test

```bash
cd packages/e2e && bun run test   # same as `bunx playwright test` above
```

## Gotchas

- **The smoke test only covers the competitions route (`/`) rendering — not a click-through interaction flow.** It stubs `/api/v1/competitions`, asserts the "Competitions" heading and a stubbed row render, screenshots, and fails on any console error. The app itself is no longer a scaffold — `/players` has a real server-driven `DataTable` (sort/filter/pagination via MRT + TanStack Router search params) — but the smoke test hasn't grown to exercise it yet. Add real interaction coverage (navigate to `/players`, exercise sort/filter/pagination) once that route needs regression protection.
- **Playwright's browser binary is a separate ~270MB download** (`bunx playwright install chromium`), not part of `bun install` — cached outside the repo, but budget for it the first time in a fresh environment.
- **`playwright` (the bare automation library) previously lived in the root `package.json`** as a quick way to drive a one-off screenshot script. Moved to `packages/e2e` as `@playwright/test` (the real test runner, not just the browser-automation primitives) once real E2E tests became the actual goal — see `docs/adr/`.
