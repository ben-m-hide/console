---
name: verify
description: Runtime-verify a change in console-next by driving its actual surface, not by re-running lint/typecheck/test/build (that's `ci.yml`'s job). Use after making a change, before calling it done.
---

This is a monorepo — the surface depends on which part changed, not one repo-wide recipe.

## Pick the surface

- **`apps/web` change** → drive it via `apps/web/.claude/skills/run-web` (Playwright against the real dev server, not a unit test import).
- **`apps/api` change** → drive it via `apps/api/.claude/skills/run-api`'s `smoke.sh` (real HTTP requests against the running server).
- **`apps/ingestion` change** → run the real script against Sportmonks + the `local-dev` Neon branch (see `apps/ingestion/CLAUDE.md`); confirm via a live DB query, not just a clean exit code.
- **`.github/workflows/*.yml` change** → the surface is GitHub Actions itself, not the YAML. You can't "run" a workflow file locally in a way that proves anything. Push it (or find the PR that already did), then read what actually happened:
  ```bash
  gh pr checks <pr-number>
  gh api repos/ben-m-hide/console/issues/<pr-number>/comments --jq '.[] | select(.user.login | contains("github-actions")) | .body'
  ```
  For `bundle-size.yml` specifically, the bot's comment lists every file its `pattern` matched — that's the real evidence of what the pattern does, not reading the glob and reasoning about it.
- **`infra/` (CDK) change** → `cdk synth` and read the synthesized template diff (never `deploy`/`bootstrap` — see root `CLAUDE.md`'s guardrails).
- **Docs-only / types-only / config with no behavioral emit** → SKIP, say so, don't run the pipeline to fill the space.

## Don't

Don't treat `bun run lint`/`typecheck`/`test`/`build` as verification — CI already runs the full pipeline on every PR (`ci.yml`). Running it again here proves you can run CI, not that the change works at its actual surface.
