---
name: web-architecture-review
description: Review apps/web's directory structure, logic placement, and import/export patterns against its own conventions and ADRs — read-only, severity-tagged findings, no edits. Use when asked to review apps/web's architecture, before a larger restructure, or periodically to catch drift (barrel cycles, misplaced logic, layering violations).
---

Review as a senior application architect would: assertive, specific about what's structurally wrong and why it'll bite later — not a hedged list of preferences. Where a project convention/ADR exists, it wins over generic best practice if the two conflict (this repo deliberately treats ADRs as binding — see root `.claude/CLAUDE.md`); where none exists, apply real frontend-architecture industry standard, not silence.

Read-only. Never call `Edit`/`Write` in this skill — findings only, handed off for a separate fix pass. A sibling `web-code-review` skill covers diff-level convention checks instead of structure; use that one for reviewing a specific change.

## Scope

The whole `apps/web/src` tree, not diff-based — a structural review needs the full picture, not just what recently changed. Start with `tree apps/web/src` (or `fd . apps/web/src`) to get the current layout before making claims about it.

## Steps

1. **Run the pipeline first.** `bun run lint` and `bun run typecheck` from the repo root. A structural finding that also breaks the build is Critical, not just an opinion.
2. **Map the layering.** `routes/` (wiring only) → `components/pages/<feature>/` → `queries/<entity>/` → `lib/api/`, per root `.claude/CLAUDE.md`'s Coding standards. Flag anything that skips a layer, puts real logic in a route file, or exports a route's component directly from the route file (breaks `autoCodeSplitting`).
3. **Check import/export hygiene:**
   - Barrel self-reference: does any file inside a barrel'd directory import from its own ancestor barrel (`@/lib/api` from within `lib/api/`) instead of the sibling file directly? Trace it — `rg 'from "@/<dir>"' apps/web/src/<dir>` for each barrel'd directory and check whether the importing file is itself under that directory.
   - Barrel depth consistency — do sibling directories under the same parent (e.g. `queries/*`) follow the same barrel-per-directory pattern, or does one reach two levels deep by filename while another has its own `index.ts`?
   - Barrel over-exposure — does a directory's `index.ts` re-export something with zero consumers outside that directory? (`rg` the export name repo-wide.)
   - Promotion rule: anything in `src/lib`/`src/hooks`/`src/components/common` with exactly one consumer — should it be colocated instead? A `../../../` import anywhere is the signal something's in the wrong place.
4. **Check naming** — does a directory/file's name describe what it actually holds (not what it sounds like it should), per `docs/conventions/typescript.md`'s "Where types live" and "Use explicit, human-readable names"?
5. **Cross-check against ADRs** (`docs/adr/README.md`) — read ones plausibly relevant to what you're reviewing (workspace structure: 0011; API client: 0016) before flagging something the ADR already justifies.
6. **Apply real frontend-architecture industry standard as its own check**, not just where project docs are silent: state-management boundaries (server state in Query vs. client state in Zustand staying separate), prop-drilling depth, component coupling/cohesion, testability of extracted logic, whether a "common" component is actually generic or one consumer's implementation leaking a false-generic interface.
7. **Report, don't fix.**

## Severity

Same rubric as `web-code-review`:

- **Critical** — breaks the build, or a real circular-import risk (not just theoretical).
- **High** — clear architectural violation of a documented convention/ADR (layering skip, barrel self-reference).
- **Medium** — inconsistency across otherwise-similar directories, premature/missing promotion.
- **Low** — naming nit, cosmetic.

## Output

Markdown, grouped by severity (omit empty groups). Each finding: `file:line` or directory path, what's wrong, why (which convention/ADR/principle), concrete evidence (the actual import chain, not just an assertion). Close with a one-line hand-off note for the fix pass — don't apply anything yourself.
