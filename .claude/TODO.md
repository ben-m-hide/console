# Claude Code tooling TODO

Task tracking for Claude Code tooling/meta work in this repo — skills, settings, hooks, subagents, commands. Same [todo-md](https://github.com/todo-md/todo-md) convention as the root [`TODO.md`](../TODO.md), which covers product/repo tasks (backend, frontend, infra, deployment) — this file is only for how Claude Code itself is set up to work in this repo.

## Open

- [ ] Run `/verify` yourself — bundled, `disable-model-invocation: true`, so I can't invoke it; typing it directly records the real lint/typecheck/test/build/audit recipe into `.claude/skills/verify/`, replacing the guesswork-prone bundled default
- [ ] Populate `.claude/` further as real needs come up — `settings.json`, hooks, subagents, commands (skills and commands are the same mechanism in current Claude Code — see README). Nothing pre-built beyond what's already there; add each only when there's an actual repeated task it would serve, not speculatively.

# DONE

- [x] Per-directory `CLAUDE.md` for `infra/`, `apps/ingestion/`, `packages/shared/`, and `packages/e2e/` — done 2026-08-12, factual/current-state only (purpose, real commands, real quirks), no invented skills.
- [x] `.claude/skills/new-convention` + `.claude/rules/typescript-conventions.md` — done 2026-08-14, mirrors `new-adr`'s structure: check Biome first, `docs/conventions/` only for what a linter genuinely can't judge. Real, verified need (a real coding-conventions discussion), not speculative — the path-scoped-rules item this used to sit next to is now built, not just planned.
