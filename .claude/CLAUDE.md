# console-next

Personal/learning full-stack project — not a real product, no external users. The point is building genuine, transferable, current industry-standard practice end-to-end. Optimize advice and decisions for that goal, not for "ship fast."

Full rationale for every non-obvious choice below lives in [`docs/adr/`](./docs/adr/README.md) — **read the relevant ADR before contradicting a decision it documents, don't silently override it.**

## Stack

Bun workspace monorepo. TypeScript 7, strictest config, everywhere except `infra/` (see below).

- **`apps/web/`**: Vite 8 + React 19 + TanStack Router (file-based, `src/routes/`) + Mantine (UI) + TanStack Query/Form + Zustand + Zod. See `docs/adr/0011-apps-and-packages-workspace-restructure.md` for why the frontend is its own workspace package, not the root.
- **`apps/api/`**: Hono 4 + `@hono/zod-openapi` — REST + OpenAPI, not tRPC. Spike stage: `/health`, `/doc`, `/reference` only.
- **`infra/`** (shares root `package.json`, not a workspace package): AWS CDK (TypeScript) — S3 + CloudFront. Synthesized, **not deployed**.
- **Quality**: Biome (lint/format/import-order, everything except Markdown) + Prettier (Markdown only) + Vitest/RTL/axe-core + `bun audit`.
- **Docs**: `README.md` (stack/commands/known quirks), `CONTRIBUTING.md` (dev workflow, pinning policy), `docs/adr/` (decisions), `docs/plans/` (persisted Complex-task plans), `TODO.md` (todo-md standard — action list, not rationale).

## Commands

```sh
bun run dev / bun run build / bun run test / bun run lint / bun run typecheck
bunx vitest run <path>              # single test file
bun run format:md / format:md:check # Markdown only — Biome doesn't cover it yet
bun audit --audit-level=high
bunx cdk synth                      # infra/ — never bootstrap/deploy, see Guardrails
cd apps/api && bun run dev          # backend dev server
```

`bun run typecheck`/`build` run `codegen` (`tsr generate`) first — `src/routeTree.gen.ts` is gitignored and generated; without this they fail on a clean checkout (this bit us once, see `docs/adr/`).

## Coding standards

- TypeScript conventions Biome can't enforce (explicit naming, inline types, loops vs. array methods, util reuse) live in [`docs/conventions/typescript.md`](../docs/conventions/typescript.md), auto-loaded via `.claude/rules/typescript-conventions.md` when reading a `.ts`/`.tsx` file. Use `.claude/skills/new-convention` to add or change one.
- Arrow functions over `function`; explicit return types on everything (Biome-enforced, not a style opinion to relitigate).
- `-`-prefixed files/folders under `src/routes/` are colocated, excluded from the route tree, still importable (e.g. `-index-page.tsx`). Don't export a route's component directly from the route file — breaks `autoCodeSplitting`.
- Promote code to `src/lib`/`src/hooks` only once a second consumer actually needs it. A `../../../` import is the signal something's in the wrong place.
- Dependency pinning: float (`^`) by default. Pin exactly for large/new-surface deps with no `bun audit` allowlist safety net (`aws-cdk-lib`, `hono`), or packages whose rules can change behavior on a routine bump (Biome's `nursery` tier). GitHub Actions are pinned to commit SHAs, same reasoning.
- `exactOptionalPropertyTypes` is on everywhere except `infra/` (off there — `aws-cdk-lib`'s own types don't satisfy it, a library gap, not ours). Check empirically on a new package before assuming either way.

## Operational rules

- **Never guess — research.** Verify library/API/tool behavior against real docs or by actually running it. Training-data memory is not evidence, especially for anything version-specific (this session has caught itself wrong more than once by checking).
- **Never assert file contents from memory.** Read it in this conversation.
- Run the full pipeline (lint, typecheck, test, build, `bun audit`) before calling anything done — not just the one command related to the change.
- State assumptions explicitly; tag guesses `[ASSUMPTION]`/`[UNVERIFIED]`. If multiple reasonable interpretations exist, present them — don't pick silently. Stop and ask on genuine ambiguity rather than guessing.
- Apply standard software design principles rather than improvising novel patterns for solved problems.

## Safety guardrails (project-specific — global git/commit rules still apply)

- **No `cdk bootstrap`/`cdk deploy`, no IAM/OIDC role creation** — `cdk synth` only, until an AWS account is confirmed and explicitly approved (see `docs/adr/0007`, `TODO.md`).
- No database commands without confirming with the user first — a real Neon Postgres DB now exists (`local-dev` branch, since 2026-08-14), so this guardrail is live, not moot.
- Don't float GitHub Actions versions or remove a commit-SHA pin; don't weaken `permissions:` blocks in `.github/workflows/`.
- `.env*` files are gitignored (except `.env.example`) — never commit real secrets into one even transiently.

## Simplicity first

Before writing code, stop at the first rung that holds: (1) does this need to exist? [YAGNI] → (2) does an existing util/hook/component already do it? [DRY] → (3) does the language/stdlib/platform do it natively? → (4) does an installed dependency do it? → (5) can it be one line? → (6) only then, the minimum code that works [KISS].

Default answer to "should I add this?" is no — make the case first. No speculative features, no single-use abstractions, no impossible-scenario error handling. Never on the chopping block: trust-boundary validation, data loss, security, accessibility, type safety. Prefer deleting over adding.

## Surgical changes

Touch only what the request requires. Don't refactor or "improve" adjacent unbroken code — mention unrelated dead code you notice, don't delete it unasked. Match existing style even if you'd choose differently. Remove imports/vars/functions _your_ change orphaned; leave pre-existing dead code alone. Every changed line should trace to the actual request.

## Goal-driven execution

Turn vague tasks into verifiable ones before starting: "fix the bug" → reproduce it first, then fix, then re-verify the reproduction is gone (this is exactly how every bug in this project has actually been fixed — reproduced locally before and after, never assumed).

## Planning

Classify every task first:

- **Trivial** — single file, small diff, no new deps/shared-state/API changes, obviously reversible. Just do it, no plan.
- **Complex** — everything else: multiple files, new dependency, shared state/config changes, API/contract changes, schema/migrations, auth/permissions, unsure of approach. Editing `CLAUDE.md`, a skill, or `biome.json` is always Complex — shared behavior, not diff size. Default to Complex when unsure.

For Complex tasks: research first (read affected files/patterns/tests — only ask what exploration can't resolve), then present a plan before touching files — Files touched + why; Approach (+ alternatives if a real tradeoff); Test/type impact; Migration/breaking-change risk; Rollback plan if risky. Concise, sacrifice grammar. Self-critique — surface risks/edge cases, not just the happy path. End with an "Unresolved questions" list (omit if none), each with your recommended answer. Wait for explicit approval before touching files. If execution diverges mid-task, STOP, re-plan, re-approve — don't quietly adapt.

Once approved, persist it: `docs/plans/YYYY-MM-DD-slug.md` (see `docs/plans/README.md`). Re-approved after diverging → update that same file, don't create a second one.

## Known gotchas

Full list with reasoning lives in `README.md`'s **Known quirks** section and `docs/adr/`. Highlights: Bun workspace installs don't hoist to root `node_modules`; `axe-core`'s `color-contrast` is deliberately disabled in tests (jsdom has no layout engine); the CSP needs `style-src 'unsafe-inline'` for Mantine's runtime styles and `connect-src` is a deliberate placeholder, not the API's real origin yet; `bun audit` has no allowlist for an unfixable advisory. No custom client wrappers exist yet (no `apiClient`-style abstraction) — this project is small enough that none has been needed.

## Responses

Extremely concise — sacrifice grammar for concision. Simplest explanation first; expand only when asked or to surface a tradeoff/risk.
