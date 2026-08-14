---
name: new-convention
description: Add or modify a coding convention for console-next, deciding whether it belongs in biome.json (enforceable) or docs/conventions/ (judgment-based). Use when the user states a coding preference/rule they want followed consistently, or when reviewing code surfaces a repeated style issue worth codifying.
---

Before creating anything, check: **can Biome enforce this?** Search [Biome's rule list](https://biomejs.dev/linter/rules/) for a matching rule first — most naming/syntax preferences already have one. If yes, add it to `biome.json` and stop; no doc entry needed, since a machine-enforced rule never relies on anyone (human or Claude) remembering prose. Only fall through to a `docs/conventions/` entry when no rule exists — style choices Biome genuinely can't judge (explicit naming beyond casing, structural preferences like "name the return value," process discipline like "check for an existing util first").

## If Biome can enforce it

1. Find the rule (biomejs.dev/linter/rules/), confirm its default doesn't already cover this.
2. Add it under the right category in `biome.json`'s `linter.rules`.
3. Run `bun run lint` to see what it flags across the existing codebase.
4. If it's a mechanical, zero-judgment autofix (e.g. array-type syntax) fix it now — don't let a new rule leave `bun run lint`/CI broken. If violations need a judgment call (renaming, restructuring), leave them and record a `TODO.md` item instead of fixing inline.
5. If the rule needs an exception for a real, narrow reason (e.g. code that must mirror an external API's raw field names), use `biome.json`'s top-level `overrides` array scoped to the specific file/glob — not a blanket `off`, and not a per-line `biome-ignore` repeated across many lines/files (that doesn't scale — see `apps/ingestion/src/sportmonks-types.ts` for a real example: raw Sportmonks response shapes live in their own file specifically so one `overrides` entry covers all of them).

## If it needs a doc entry

1. Decide the file: one per language/domain (`docs/conventions/typescript.md`, not one file per rule — see `docs/conventions/README.md`'s "Adding one" for why). Create the directory/file lazily, only when the first rule for that domain exists.
2. Write the entry as a section: a short imperative heading, one paragraph of _why_ (not just what), then a real `Avoid`/`Prefer` code pair — not abstract prose. Pull the bad example from actual code in this repo if one exists, don't invent one.
3. Add a row to `docs/conventions/README.md`'s table if this is a new file.
4. Add a matching thin trigger in `.claude/rules/<domain>-conventions.md` with `paths:` frontmatter matching the file types this applies to, pointing back at the doc — don't duplicate the content into the rule file itself. See `.claude/rules/typescript-conventions.md` for the pattern.
5. Run `bun run format:md` before finishing.

## Both cases

- If a convention is genuinely narrower than "applies everywhere" (a single package's own quirk), it belongs in that package's `.claude/CLAUDE.md`, not `docs/conventions/` — this directory is for repo-wide conventions only.
- Don't create a `docs/adr/` entry for a convention — style choices are trivially reversible and don't clear ADR's "hard to reverse" bar (see `.claude/skills/new-adr`). The rare exception is a convention that's itself the result of a genuine architectural trade-off, which is unusual.
- Existing violations found while adding a _judgment-based_ convention aren't this skill's job to fix — record them as a `TODO.md` scan-and-fix item instead of fixing inline, unless the user explicitly asks for the fix now.
