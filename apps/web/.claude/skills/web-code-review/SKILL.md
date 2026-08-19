---
name: web-code-review
description: Review a diff in apps/web against its own conventions, ADRs, and Biome rules — read-only, severity-tagged findings, no edits. Use when asked to review code changes in apps/web, before opening a PR, or after finishing a change there.
---

Review as a senior React/TypeScript engineer would: assertive, specific, opinionated about what's actually wrong — not hedged, not a style-preference dump. Where a project convention/ADR exists, it wins over generic best practice if the two conflict (this repo deliberately treats ADRs as binding — see root `.claude/CLAUDE.md`); where none exists, apply real industry standard, not silence.

Read-only. Never call `Edit`/`Write` in this skill — findings only, handed off for a separate fix pass. A sibling `web-architecture-review` skill covers directory structure/layering/imports instead of diff content; use that one for a whole-tree structural review.

## Scope

Default target: the diff between `main` and the current branch/working tree (`git diff $(git merge-base main HEAD)...HEAD -- apps/web` plus uncommitted changes), restricted to `apps/web/`. If the user names specific files/a directory/a different base ref, review that instead.

## Steps

1. **Run the pipeline first.** `bun run lint` and `bun run typecheck` from the repo root (the latter runs `codegen` for you). Fold any failures straight into the report — don't re-derive by eye what the tooling already caught.
2. **Get the diff**, scoped as above.
3. **Check every changed line** against:
   - `docs/conventions/typescript.md` (all `.ts`/`.tsx`), `react.md` (`.tsx`), `testing.md` (`.test.tsx`) — read the relevant file(s) for the changed extensions, don't assume from memory.
   - `biome.json` directly — for anything Biome's `nursery`/project-specific rules cover that isn't already caught by step 1 (e.g. a rule that only fires in stricter contexts).
   - Root `.claude/CLAUDE.md`: Simplicity first (YAGNI/DRY/KISS ladder), Surgical changes (scope creep, orphaned imports), the promotion rule (`src/lib`/`src/hooks`/`src/components/common` only on a genuine second consumer — a `../../../` import is the tell).
   - Relevant ADRs (`docs/adr/README.md` — read the ones plausibly touched by the diff, e.g. API-client changes against 0016, enum usage against 0018, optional-field modeling against 0017). Don't contradict an ADR's decision without reading it first.
   - **Real React 19 / TanStack / REST-client industry standard, as its own check** — not just a gap-filler for what the project docs miss. Hooks (deps arrays, stale closures, unnecessary re-renders), accessibility (semantic HTML, ARIA, keyboard/focus), security (XSS via unsanitized HTML injection, no secrets/tokens in client code), error-boundary coverage, race conditions in async effects/queries, test coverage for new logic. Flag it even if no project doc says so explicitly — that's the point of this check, not a fallback.
4. **Report, don't fix.**

## Severity

- **Critical** — bug, security issue, data loss, breaks the build/pipeline.
- **High** — clear violation of a documented convention or ADR, real risk if left in.
- **Medium** — code smell: DRY/simplicity/YAGNI violation, missing test coverage for non-trivial logic.
- **Low** — nit, style preference Biome doesn't enforce, a comment/naming quibble.

## Output

Markdown, grouped by severity (omit empty groups). Each finding: `file:line`, one-sentence description of what's wrong, which convention/ADR/rule it violates. Close with a one-line hand-off note (e.g. "apply via a follow-up edit pass, or `/code-review --fix` for the mechanical ones") — don't apply anything yourself.
