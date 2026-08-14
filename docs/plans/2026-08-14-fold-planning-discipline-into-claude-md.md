# Fold Task Complexity classification + persisted plan-file convention into CLAUDE.md

## Files touched + why

- `.claude/CLAUDE.md` — rewrite `## Planning` in place (not append — new content overlapped existing lines in `Planning`, `Goal-driven execution`, and `Operational rules`). Net-new: Trivial/Complex classification with a "default to Complex" tiebreak, an explicit clause that editing `CLAUDE.md`/a skill/`biome.json` is always Complex regardless of diff size, the structured plan-field list, and the persist-on-approval step. Removed the now-duplicate one-line plan rule from `Goal-driven execution`. Also added `docs/plans/` to the Stack → Docs bullet.
- `docs/plans/README.md` (new) — convention: filename format, frozen-at-approval semantics, why not a heavier spec-driven (spec-kit-style) workflow.
- `docs/plans/2026-08-14-fold-planning-discipline-into-claude-md.md` (this file) — the plan itself, persisted per the new convention it introduces.
- `.claude/skills/plan/SKILL.md` (new) — classify → research/draft → present → wait for approval → persist → handle mid-task re-approval, mirroring `new-adr`/`new-convention`'s structure.
- `README.md` — add `docs/plans/` to the repo tree diagram.
- `.claude/TODO.md` — DONE entry once this lands.

## Approach

Single PR, docs/config only, no code/behavior change. Persist plans as one markdown file per Complex task, named by approval date, frozen once written — deviations tracked via re-plan-and-update-in-place, not appended narrative (that's `TODO.md`'s job, already does this well per its existing entries). Every Complex task gets a persisted file (not gated behind ADR's stricter three-part bar) — accepted volume tradeoff since the plan content already exists at approval time, so persisting it costs a save, not new authoring. Skill named `plan` (owns both creation and mid-task re-approval updates, like `commit` owns its whole workflow) rather than `new-plan` (creation-only, like `new-adr`).

### Alternatives considered

- `.claude/plans/` instead of `docs/plans/` — rejected: `.claude/TODO.md`'s scope is Claude-tooling-only (skills/hooks/settings); plans cover product/infra work too, so `docs/` is the right peer to `docs/adr/`.
- Full spec-kit-style multi-file-per-feature (spec.md/plan.md/tasks.md in numbered dirs) — rejected as oversized for this project's scale; one file per approved plan gives the same traceability without the extra machinery.
- An ADR for this convention — rejected per `new-convention`'s own rule: a reversible process choice, not an architectural trade-off.

## Test/type impact

None — docs/config only. Run `bun run format:md` and `bun run lint` after.

## Migration/breaking-change risk

None. Additive only.

## Rollback plan

Revert the PR.
