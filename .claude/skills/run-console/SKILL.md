---
name: run-console
description: Build, run, and screenshot the console-next frontend (the Vite/React SPA at the repo root). Use when asked to start the console, take a screenshot of its UI, or verify it renders.
---

Driven via the real Playwright Test suite in `packages/e2e/` — not a bespoke script. Playwright's own `webServer` config starts the Vite dev server, waits for it to be ready, runs the test, and shuts the server down afterward; there's no manual background-launch/poll/kill needed.

This is the repo root (the frontend is the root package, not a `packages/console/` — see `docs/adr/0008-hono-rest-openapi-backend.md` for why). A sibling `run-api` skill inside `packages/api/.claude/skills/` covers the backend. `packages/e2e/` is a third workspace package, holding only the Playwright Test suite (see `docs/adr/` for why it's separate from the root rather than living alongside the app it tests).

## Prerequisites / Setup

```bash
bun install
bunx playwright install chromium   # one-time; downloads to ~/Library/Caches/ms-playwright (or the Linux equivalent), not into the repo
```

## Build

None. `bun run dev` (invoked by Playwright's `webServer` config) serves the frontend directly.

## Run (agent path)

```bash
cd packages/e2e
bunx playwright test
```

That's the whole thing — `playwright.config.ts`'s `webServer` handles start/wait/stop. `tests/smoke.spec.ts` navigates to `/`, waits for the real "console-next" heading and "It works" button (not a fixed sleep), screenshots to `/tmp/console-next-screenshot.png`, and fails if the browser console logged an error.

## Run (human path)

`bun run dev` (from the repo root), open `http://localhost:5173`, Ctrl-C to stop.

## Test

```bash
cd packages/e2e && bun run test   # same as `bunx playwright test` above
```

## Gotchas

- **There's no real interaction to drive yet.** The "It works" button has no `onClick` — the app is still a scaffold (one static route, see `docs/adr/0001`–`0008`). The test verifies the page renders correctly with zero console errors; it doesn't click through a flow, because there isn't one. Add a real interaction test once a real interactive feature exists.
- **Playwright's browser binary is a separate ~270MB download** (`bunx playwright install chromium`), not part of `bun install` — cached outside the repo, but budget for it the first time in a fresh environment.
- **`playwright` (the bare automation library) previously lived in the root `package.json`** as a quick way to drive a one-off screenshot script. Moved to `packages/e2e` as `@playwright/test` (the real test runner, not just the browser-automation primitives) once real E2E tests became the actual goal — see `docs/adr/`.
