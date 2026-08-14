# Claude Code tooling TODO

Task tracking for Claude Code tooling/meta work in this repo — skills, settings, hooks, subagents, commands. Same [todo-md](https://github.com/todo-md/todo-md) convention as the root [`TODO.md`](../TODO.md), which covers product/repo tasks (backend, frontend, infra, deployment) — this file is only for how Claude Code itself is set up to work in this repo.

## Open

- [ ] Populate `.claude/` further as real needs come up — `settings.json`, hooks, subagents, commands (skills and commands are the same mechanism in current Claude Code — see README). Nothing pre-built beyond what's already there; add each only when there's an actual repeated task it would serve, not speculatively.

# DONE

- [x] Task Complexity classification (Trivial/Complex) + persisted plan-file convention — done 2026-08-14. Rewrote `.claude/CLAUDE.md`'s `## Planning` section, added `docs/plans/` (README + the first plan, itself, per `docs/plans/2026-08-14-fold-planning-discipline-into-claude-md.md`), and `.claude/skills/plan/SKILL.md`. Every Complex task now gets its approved plan persisted to `docs/plans/YYYY-MM-DD-slug.md`, frozen at approval — deviations tracked via re-plan-and-update-in-place, outcomes left to `TODO.md`/commits.

- [x] Per-directory `CLAUDE.md` for `infra/`, `apps/ingestion/`, `packages/shared/`, and `packages/e2e/` — done 2026-08-12, factual/current-state only (purpose, real commands, real quirks), no invented skills.
- [x] `.claude/skills/new-convention` + `.claude/rules/typescript-conventions.md` — done 2026-08-14, mirrors `new-adr`'s structure: check Biome first, `docs/conventions/` only for what a linter genuinely can't judge. Real, verified need (a real coding-conventions discussion), not speculative — the path-scoped-rules item this used to sit next to is now built, not just planned.
- [x] Run `/verify` yourself — done 2026-08-14. Turned out to be the opposite of the guesswork it replaced: the bundled skill's actual instructions explicitly forbid treating lint/typecheck/test/build as verification (that's `ci.yml`'s job) — it demands driving the change's real runtime surface instead. Verified the merged `bundle-size.yml` CSS-pattern fix (PR #41) by reading the real GitHub Actions run and bot comment rather than re-running anything locally. Persisted the per-surface recipe to `.claude/skills/verify/SKILL.md`.
