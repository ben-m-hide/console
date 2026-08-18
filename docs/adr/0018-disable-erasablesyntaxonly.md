# Disable `erasableSyntaxOnly`, allow TS `enum`

## Status

Accepted — built. `tsconfig.base.json`'s `erasableSyntaxOnly` removed; `apps/web/tsconfig.node.json`'s standalone copy (governs only `vite.config.ts`) removed too, for consistency. `apps/web/src/routing/player.ts`'s `PLAYER_POSITIONS` (`as const` array + derived union type) converted to `enum PlayerPosition`, now living in a new `apps/web/src/types/` module (`types/enums.ts`, barrel-exported via `types/index.ts`) rather than `routing/` — it's a domain-level type, not route-scoped, and other consumers (`PlayersList.tsx`) import it directly from `@/types` rather than through the search-schema module. First and so far only enum in the codebase.

## Context

The flag was part of "TypeScript 7, strictest config" (ADR 0003) and blocks non-erasable syntax — regular (non-`const`) `enum`, parameter properties, `import =`/`export =` — on the theory that source should stay compilable by a plain type-stripper (Node's `--experimental-strip-types`) with zero transform step, not just a bundler.

It surfaced directly while discussing whether `PLAYER_POSITIONS` should be a TS `enum` instead of its `as const` array: `z.enum()` in this project's pinned Zod v4 accepts a TS enum object directly (`nativeEnum` is deprecated, merged into `enum()` — confirmed against the installed `zod@4.4.3` `.d.ts`, not assumed), so the Zod-integration objection didn't hold. But `tsc` itself rejected `enum PlayerPosition { ... }` with `TS1294: This syntax is not allowed when 'erasableSyntaxOnly' is enabled` — confirmed empirically with a throwaway `tsconfig`, not asserted from memory. Checked whether the flag was load-bearing for this project's actual runtime (Bun executes `apps/api`/`apps/ingestion` `.ts` files directly): also confirmed empirically — `bun run` on a file containing a real enum executes it correctly, object and reverse-lookup values intact. Bun's own transpiler does the full enum-lowering transform, unlike Node's flag-driven strip-only mode. So the flag was enforcing a hypothetical constraint (staying compatible with a stripping-only runtime) this project doesn't actually have.

User preference for enums here was explicit and reiterated after being shown the trade-off (union-of-literals is more idiomatic in most current TS style guides, avoids TS enum's non-reverse-mapping/const-enum-transpiler quirks) and, separately, after the tsc error was found.

## Decision

Remove `erasableSyntaxOnly` from `tsconfig.base.json` and from `apps/web/tsconfig.node.json`'s own standalone copy (the latter only typed `vite.config.ts`, never needed an enum, but leaving the flag on there once the rest of the repo had it off would be an unexplained inconsistency). No `infra/tsconfig.json` override existed for this flag, so nothing to clean up there (unlike ADR 0017's `exactOptionalPropertyTypes`).

`PLAYER_POSITIONS`/`PlayerPosition` is now `apps/web/src/types/enums.ts`:

```ts
export enum PlayerPosition {
  Attacker = "Attacker",
  Defender = "Defender",
  Goalkeeper = "Goalkeeper",
  Midfielder = "Midfielder",
}
```

`routing/player.ts` imports it from `@/types` to build `PlayersSearchSchema` (`z.enum(PlayerPosition)` replaces `z.enum(PLAYER_POSITIONS)` directly — no `z.nativeEnum()` needed). `PlayersList.tsx`'s `<Select>` options build from `Object.values(PlayerPosition)` instead of iterating the old array directly, importing the enum from `@/types` rather than through `routing/player.ts`.

## Consequences / known gaps, deliberately not resolved here

- This is a **loosening**, not a sweep — turning the flag off doesn't invalidate any code that was already compliant (every existing file still typechecks unchanged; confirmed via a full `bun run typecheck` pass). No `exactOptionalPropertyTypes`-style repo grep was needed for that reason.
- **Standing tension, not resolved by this ADR**: root `CLAUDE.md` frames this project's purpose as "genuine, transferable, current industry-standard practice," and TS enums are widely discouraged in current style guides (Google's TS style guide bans them outright; the TypeScript team's own docs note most codebases prefer union-of-literals) for reasons unrelated to `erasableSyntaxOnly` — non-tree-shakeable output, numeric-enum reverse-mapping surprises, inconsistent behavior between `enum`/`const enum`. This project now has one deliberately, as an explicit preference call, not because research found enums to be the better-practice default. Future `enum` usage should be a similar explicit choice, not a default reached for out of habit.
- `const enum` remains untested/unused here — it wasn't needed (Bun and Vite's esbuild both fully lower regular enums), and `const enum` carries its own, separate transpiler-safety problems unrelated to this decision.

## Considered and rejected

- **Keep `PLAYER_POSITIONS` as the `as const` array, leave the flag on.** Was the standing recommendation — zero cost, works with `z.enum()`, directly iterable for `<Select>` options, no non-erasable-syntax exposure. Explicitly overridden by direct user preference for enum syntax, after the trade-off (including the compile error once found) was surfaced.
- **Scope `erasableSyntaxOnly` off only for `apps/web` (or only `routing/player.ts`'s directory), matching `infra/`'s narrow-override precedent for other flags.** Rejected for the same reason ADR 0017 rejected a narrow scope for `exactOptionalPropertyTypes` — the flag protects a repo-wide claim ("this code stays strippable"), and nothing about wanting one enum was `apps/web`-specific; a future package reaching for an enum shouldn't hit an inconsistent per-directory rule.
