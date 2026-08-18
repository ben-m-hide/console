# Plans

One file per approved plan for a **Complex** task (see `.claude/CLAUDE.md`'s Planning section for the Trivial/Complex split). Written only after the plan is presented and explicitly approved — not before, and not for Trivial tasks.

Naming: `YYYY-MM-DD-slug.md`, date of approval.

## The map

Newest first. This table is for **navigation only** — what a plan covered, so you can find the right one. It deliberately carries **no status or outcome column**: what actually happened lives in `TODO.md` and commit messages (see below), and duplicating it here would create a second record to keep in sync.

> Originally this directory had no index, on the reasoning that "plans aren't globally ordered, `fd`/`ls` is enough to browse them." That held at two or three files. It stopped holding once a `YYYY-MM-DD-slug` filename was no longer enough to tell you what a plan actually covered — added 2026-08-15, matching the map pattern `docs/adr/` and `docs/design/` already use.

| Date       | Plan                                                                                                | Covered                                                                                          |
| ---------- | --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| 2026-08-18 | [Generic `list()` fetch + `listQueryOptions()` factory](./2026-08-18-generic-list-query-factory.md) | Deduplicated fetch+parse across players/competitions queries; `src/queries/` relocation          |
| 2026-08-16 | [`/players` + `/seasons` routes](./2026-08-16-players-and-seasons-routes.md)                        | Paginated player list, season list, the API navigability fixes it surfaced                       |
| 2026-08-15 | [Router query-context rewiring](./2026-08-15-router-query-context.md)                               | Router `context` + `QueryClientProvider` placement fix; first loader-driven route                |
| 2026-08-15 | [Wire `apps/web` to `apps/api`](./2026-08-15-wire-frontend-to-api.md)                               | First real browser→API request; `packages/shared` in the frontend; `createQueryClient()` factory |
| 2026-08-14 | [`apps/api` Vitest setup](./2026-08-14-api-vitest-setup.md)                                         | Test setup for the API; pure-logic extraction from the compare route                             |
| 2026-08-14 | [Coverage PR comments](./2026-08-14-coverage-pr-comments.md)                                        | Per-package coverage reports posted on PRs                                                       |
| 2026-08-14 | [Planning discipline into CLAUDE.md](./2026-08-14-fold-planning-discipline-into-claude-md.md)       | Trivial/Complex classification + the persisted plan-file convention itself                       |
| 2026-08-14 | [`/players/compare` + player stats ingestion](./2026-08-14-players-compare-route.md)                | Premier League player/stat ingestion; the percentile comparison route                            |
| 2026-08-14 | [PR title lint](./2026-08-14-pr-title-lint.md)                                                      | Conventional Commits enforcement on PR titles                                                    |

## Lifecycle

A plan file is frozen at approval — it's the record of what was agreed, not a running log. If execution diverges mid-task, the re-approved plan updates the same file in place (no second file for the same task). Outcomes, deviations found during implementation, and completion notes belong in `TODO.md`/commit messages, same as every other change in this project — not appended here, to avoid duplicating that record.

## Why not a heavier spec-driven workflow

Tools like GitHub's spec-kit use a constitution/spec/plan/tasks multi-file flow per feature, in numbered directories. That's built for teams coordinating many parallel agents against a shared spec. This project is personal/learning-scale with one contributor — one file per plan, using the template already in `.claude/CLAUDE.md`, is enough to get the same traceability (what was decided before writing code, why, what the risks were) without the extra machinery.
