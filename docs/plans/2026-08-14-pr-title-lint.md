# Enforce Conventional Commits PR titles

## Files touched + why

- New `.github/workflows/pr-title-lint.yml` — validates every PR's title matches Conventional Commits, same shape this repo's `commitlint.config.js` already enforces on individual commit messages.

## Approach

`amannn/action-semantic-pull-request` (1.4k★, industry-standard for this job, latest `v6.1.1` pinned to `48f256284bd46cdaab1048c3721360e808335d50`).

- **No `actions/checkout` needed** — the action reads the PR title via the GitHub API, never touches repo contents. Simplest possible workflow.
- **`pull_request` trigger, not `pull_request_target`**: this repo has one contributor with write access and no fork PRs — `pull_request_target`'s extra complexity (config sourced from `main`, fork-safety) buys nothing here, per the action's own documented guidance on when each applies. `types: [opened, edited, synchronize]` so both new PRs and title edits/new pushes re-validate.
- **`permissions: pull-requests: read`** — tighter than `bundle-size.yml`/`dependency-review.yml`'s `write`, since this workflow isn't opting into the `wip:` flag or posting an error comment on failure (the check's own red ❌ status is enough feedback).
- **No custom `types`/`scopes`/`requireScope` config** — defaults already match: this repo's `commitlint.config.js` just extends `@commitlint/config-conventional` (no custom type list), and the action's default type list matches the same canonical Conventional Commits set. `requireScope` defaults to `false`, so `chore: release main` (release-please's own PR title, verified via `gh pr list`) passes without a scope.

## Test/type impact

None — no code touched, pure CI config.

## Migration/breaking-change risk

Low, additive. Not wired into branch protection as a required check yet — that's a manual GitHub Rulesets step for the user to do afterward (same pattern as the original `ci` required-check setup), not something done here automatically.

## Rollback plan

Delete the workflow file.

## Self-critique

Until it's added as a required status check, this only surfaces a red ❌ on the PR — doesn't block merging. That's an intentional first step (verify the check itself works correctly before making it load-bearing), not an oversight.
