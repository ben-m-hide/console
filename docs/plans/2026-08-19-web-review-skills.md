# Two `apps/web`-scoped review skills

## Context

An ad-hoc architecture review of `apps/web` (this session) surfaced several real issues — self-referential barrel imports, inconsistent barrel depth, a misleadingly-named directory — that got fixed, but the review itself was a one-off manual pass. Formalize both the code-level and architecture-level review into repeatable, directory-scoped skills so the same checks run consistently in future sessions, without needing to re-derive them from scratch each time.

## Approach

Two new skills, directory-scoped under `apps/web/.claude/skills/` — matching the existing `run-console` precedent (a skill scoped to `apps/web` lives inside it, not at the repo root). Both are read-only: they report findings, they don't edit files.

**Naming — `web-code-review` / `web-architecture-review`, not `code-review` / `architecture-review`:** the repo-root skill list already has a global `code-review` skill, including a billed `ultra` cloud-multi-agent mode. A directory-scoped skill sharing that exact name would shadow the global one whenever Claude is working inside `apps/web` (Skill tool resolution: "most specific wins"), risking a `/code-review ultra` call silently running the free local reviewer instead of the intended paid cloud one. Distinct names avoid the collision.

**`web-code-review`**

- Scope: diff since a base ref (default: merge-base with `main`), restricted to `apps/web/`; optional arg to target specific file(s)/dir instead.
- Runs `bun run lint`/`bun run typecheck` first (cheap, catches anything Biome/tsc already enforce) and folds that output into the report rather than re-deriving it by reading code.
- Checks the diff against: `docs/conventions/typescript.md`, `react.md`, `testing.md`; `biome.json` rules directly; relevant ADRs (points at `docs/adr/README.md`, doesn't duplicate ADR content); general React 19/TanStack/REST-client best practice where no project doc already covers it.
- Severity: Critical (bug/security/data-loss/breaks build) / High (clear convention or ADR violation, real risk) / Medium (code smell — DRY/simplicity/YAGNI per root `CLAUDE.md`) / Low (nit, unenforced style preference).
- Output: markdown, grouped by severity, each item `file:line` + what's wrong + which convention/ADR it violates. No edits — ends by naming the hand-off path for applying fixes.

**`web-architecture-review`**

- Scope: the whole `apps/web/src` tree, not diff-based — structural review needs the full picture.
- Also runs lint/typecheck first, same reasoning.
- Checks: directory structure/layering (routes → pages → queries → lib, per root `CLAUDE.md`'s promotion rules), import/export hygiene (barrel self-reference, over-exposure — the exact issue class found and fixed this session), naming, against the same conventions/ADRs, plus general frontend-architecture best practice (separation of concerns, colocation vs. promotion, circular-import risk).
- Same severity rubric and output shape as `web-code-review`, for consistency. Read-only, same as the code reviewer — a "sometimes edits" review skill would be ambiguous about when it's safe to just run.

## Files touched

| File                                                       | Change |
| ---------------------------------------------------------- | ------ |
| `apps/web/.claude/skills/web-code-review/SKILL.md`         | New    |
| `apps/web/.claude/skills/web-architecture-review/SKILL.md` | New    |

## Test/type impact

None — markdown only.

## Migration/breaking-change risk

None. Purely additive.

## Rollback

Delete the two files.
