# packages/e2e

Playwright E2E suite, its own workspace package rather than living inside `apps/web` — see `docs/adr/0009-e2e-as-own-workspace-package.md` for why. Drives a real dev server (`playwright.config.ts`'s `webServer` runs `bun run dev` from the repo root).

Root `.claude/CLAUDE.md` rules (stack, coding standards, guardrails) apply here unmodified — this file only adds what's specific to this package.

## Commands

```sh
bun run test        # playwright test
bun run typecheck
```

## Notes

- Currently one smoke test (`tests/smoke.spec.ts`) — loads the homepage, checks it renders with no console errors. Real flow coverage is still open, see `TODO.md`'s Testing section.
- `baseURL` is `http://localhost:5173` (Vite dev server default) — `webServer.reuseExistingServer` is `true` outside CI, so a dev server you already have running locally gets reused instead of a second one being spawned.
