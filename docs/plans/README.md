# Plans

One file per approved plan for a **Complex** task (see `.claude/CLAUDE.md`'s Planning section for the Trivial/Complex split). Written only after the plan is presented and explicitly approved — not before, and not for Trivial tasks.

Naming: `YYYY-MM-DD-slug.md`, date of approval. No index table (unlike `docs/adr/`'s numbered decisions) — plans aren't globally ordered, `fd`/`ls` is enough to browse them.

A plan file is frozen at approval — it's the record of what was agreed, not a running log. If execution diverges mid-task, the re-approved plan updates the same file in place (no second file for the same task). Outcomes, deviations found during implementation, and completion notes belong in `TODO.md`/commit messages, same as every other change in this project — not appended here, to avoid duplicating that record.

## Why not a heavier spec-driven workflow

Tools like GitHub's spec-kit use a constitution/spec/plan/tasks multi-file flow per feature, in numbered directories. That's built for teams coordinating many parallel agents against a shared spec. This project is personal/learning-scale with one contributor — one file per plan, using the template already in `.claude/CLAUDE.md`, is enough to get the same traceability (what was decided before writing code, why, what the risks were) without the extra machinery.
