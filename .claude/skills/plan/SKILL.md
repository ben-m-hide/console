---
name: plan
description: Classify a task Trivial/Complex, and for Complex tasks run console-next's plan → approve → persist workflow, writing the approved plan to docs/plans/. Use before starting any multi-file task, new dependency, shared-state/config/API/schema change, or CLAUDE.md/skill/biome.json edit — or whenever unsure if a task is Trivial.
---

Full rule lives in `.claude/CLAUDE.md`'s `## Planning` section — this skill is the workflow that executes it.

## Steps

1. **Classify.** Trivial (single file, small diff, no new deps/shared-state/API changes, obviously reversible) → just do it, skip the rest of this skill. Complex (everything else, including any edit to `CLAUDE.md`, a skill, or `biome.json`) → continue. Default to Complex when unsure.
2. **Research.** Read affected files, existing patterns, related tests. Only bring genuinely unresolved questions to the user — don't ask what exploration already answers.
3. **Draft the plan**, in this shape:
   - Files touched + why
   - Approach (+ alternatives, if a real tradeoff)
   - Test/type impact — what breaks, what needs new coverage
   - Migration/breaking-change risk
   - Rollback plan if risky
4. **Self-critique.** Surface risks/edge cases explicitly — don't just present the happy path.
5. **Present the plan**, concise (sacrifice grammar), ending with an "Unresolved questions" list (omit if none) — each with your recommended answer. Do not touch files yet.
6. **Wait for explicit approval.** If execution diverges mid-task, stop, re-plan, re-present — don't quietly adapt.
7. **Once approved, persist it**: write the plan to `docs/plans/YYYY-MM-DD-slug.md` (date of approval, short kebab slug — see `docs/plans/README.md`). Then implement.
8. **If re-approved after a mid-task divergence**, update that same file in place — don't create a second file for the same task.

A plan file is frozen once written, not a running log — outcomes and deviations discovered during implementation go in `TODO.md`/commit messages, same as every other change in this project, not appended back into the plan file.
