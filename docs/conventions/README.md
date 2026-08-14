# Coding Conventions

Conventions that can't be enforced by Biome — grouped by language/domain, one file per group (not one per rule; see "Adding one" below for why). Rules Biome _can_ enforce live in `biome.json` directly, not here — a doc entry only exists for what a linter can't check.

Each convention file is also mirrored by a thin trigger in [`.claude/rules/`](../../.claude/rules/) (`paths:` frontmatter matching the relevant file types), so Claude Code loads it automatically when reading a matching file — see [Claude Code's memory docs](https://code.claude.com/docs/en/memory.md#organize-rules-with-claude/rules/).

| File                             | Covers                                                                                                                   | Auto-loaded for       |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | --------------------- |
| [typescript.md](./typescript.md) | Naming inline types, explicit/human-readable names, named returns, loops vs. array methods, util reuse, where types live | `**/*.ts`, `**/*.tsx` |

## Adding one

Before adding a convention, check: can Biome enforce this instead? If yes, add a `biome.json` rule and stop — no doc entry needed (see the root `.claude/skills/new-convention/SKILL.md` for the full process).

Grouped by language/domain, not one file per rule — unlike ADRs, which document independent decisions, conventions are consumed as a coherent set (a style guide) and the natural load-trigger is "I'm writing TypeScript," not "I'm avoiding single-letter names." Add a new file only when a genuinely different file type/domain needs its own set (e.g. `react.md` for TSX-specific rules, `sql.md` if this project ever hand-writes raw SQL) — don't split `typescript.md` further just because it's grown a few sections.
