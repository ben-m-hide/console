# console-next

Standalone TypeScript + React app. Not part of the `m3ter-console-v3` monorepo — see `docs/adr/0002-bun-as-package-manager.md` for why.

## Stack

- **Ships as:** a static SPA (no server runtime in production)
- **Toolchain:** Bun, Node 24 (Active LTS) for local dev/CI — bump to Node 26 once it enters Active LTS on 2026-10-28 (see `.nvmrc`/`engines`)
- **Language:** TypeScript 7, strictest config
- **Framework:** Vite + React, TanStack Router (file-based routes in `src/routes/`)
- **Styling:** Tailwind v4 + shadcn/ui (Base UI, Nova preset)
- **State/data:** Zustand (client state), TanStack Query (server state), TanStack Form + Zod (forms/validation)
- **Quality:** Biome (lint + format + import ordering + Tailwind class sorting), Vitest + React Testing Library (globals enabled — no need to import `describe`/`it`/`expect` per test file)
- **Import grouping (`assist/source/organizeImports` in `biome.json`):** Node/Bun builtins → npm packages → `@/*` internal alias → relative paths → side-effect/bare imports (e.g. `./index.css`) last, each group blank-line-separated, applied automatically on save/`bun run lint:fix`.
- **Code style (enforced by Biome, `error`/`warn`):** arrow functions over `function` (`lint/complexity/useArrowFunction`) — fall back to `function`/reorder declarations only when hoisting genuinely requires it; explicit return types on all functions (`lint/nursery/useExplicitReturnType`); Tailwind classes auto-sorted inside `className`, `cn()`, `cva()`, `clsx()` (`lint/nursery/useSortedClasses`)
- **Git hooks:** lefthook (pre-commit: Biome + typecheck; commit-msg: commitlint / Conventional Commits)
- **Editor:** `.vscode/settings.json` and `.vscode/extensions.json` are committed (not gitignored) so Biome-as-formatter and native CSS validation (which doesn't understand Tailwind v4's `@theme`/`@apply`/`@custom-variant`) are consistent for everyone, not just personal config.

Full rationale for the non-obvious choices is in `docs/adr/`.

## Commands

```sh
bun install
bun run dev         # dev server
bun run build       # typecheck + production build
bun run test        # vitest run
bun run lint        # biome check
bun run lint:fix    # biome check --write
bun run typecheck   # tsc -b --noEmit
```

## Deferred (chosen, not yet wired up)

- **E2E:** Playwright — add when there's a real user flow worth covering end-to-end.
- **CI:** GitHub Actions (lint + typecheck + test on PR) — add alongside the first real PR workflow.

## Known quirks

- `vite.config.ts` uses `path.resolve(__dirname, ...)` for the `@/*` alias instead of `import.meta.dirname`, even though Vite's native config loader warns about `__dirname` being deprecated. The shadcn CLI's alias resolution didn't parse `import.meta.dirname` correctly (it silently wrote generated components into a literal `./@` directory) — correctness for `shadcn add` wins over silencing the warning.
- `components.json`'s `$schema` points at a vendored copy in `schemas/shadcn-components.schema.json` instead of `https://ui.shadcn.com/schema.json`, so schema validation works offline and doesn't depend on an editor/network policy trusting that URL. Re-vendor it if shadcn's schema changes.
- `shadcn` (the CLI) is a `devDependency`, not a `dependency` — it's a codegen tool, never imported at runtime.
