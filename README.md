# console-next

Standalone TypeScript + React app. Not part of the `m3ter-console-v3` monorepo — see `docs/adr/0002-bun-as-package-manager.md` for why.

## Stack

- **Ships as:** a static SPA (no server runtime in production)
- **Toolchain:** Bun — sole runtime for dev/build/test/lint/CI, no Node binary involved anywhere in the pipeline. (`@types/node` is a devDependency purely for typing Node-API globals Bun implements, e.g. `import.meta.dirname` — it doesn't imply a Node runtime dependency.) An earlier `engines.node`/`.nvmrc` pin was removed: Bun doesn't enforce `engines` (confirmed — no version warning on install, and it's a tracked upstream gap, [oven-sh/bun#5846](https://github.com/oven-sh/bun/issues/5846)/[#14030](https://github.com/oven-sh/bun/issues/14030)), and nothing in the toolchain actually shells out to a Node binary for the pin to describe.
- **Language:** TypeScript 7, strictest config
- **Framework:** Vite + React, TanStack Router (file-based routes in `src/routes/`)
- **Styling/components:** [Mantine](https://mantine.dev) (`@mantine/core` + `@mantine/hooks`), styled via CSS Modules through `postcss-preset-mantine` (see `postcss.config.cjs`) — typed component props/theme object instead of Tailwind utility-class strings. Font is Geist Variable, wired through the theme in `src/lib/theme.ts`. See `docs/adr/0006-mantine-over-tailwind-shadcn.md` for why this replaced Tailwind v4 + shadcn/ui + Base UI.
- **State/data:** Zustand (client state), TanStack Query (server state), TanStack Form + Zod (forms/validation)
- **Quality:** Biome (lint + format + import ordering), Vitest + React Testing Library (globals enabled — no need to import `describe`/`it`/`expect` per test file). `bun run test:coverage` runs `@vitest/coverage-v8` (was installed but unwired until now); `coverage.all` is left at its default `false`, so only code actually exercised by a test counts — most of `src/` (routes aside from `-index-page.tsx`, `lib/`) won't show up until something tests it, which is expected for a scaffold, not a bug. No thresholds enforced yet; add `coverage.thresholds` once there's enough real code for a number to mean something.
- **Import grouping (`assist/source/organizeImports` in `biome.json`):** Node/Bun builtins → npm packages → `@/*` internal alias → relative paths → side-effect/bare imports (e.g. `./index.css`) last, each group blank-line-separated, applied automatically on save/`bun run lint:fix`.
- **Code style (enforced by Biome, `error`):** arrow functions over `function` (`lint/complexity/useArrowFunction`); explicit return types on all functions (`lint/nursery/useExplicitReturnType`); React hook rules — `useExhaustiveDependencies`/`useHookAtTopLevel` — are auto-enabled by Biome's "react" domain just from having `react` as a dependency, no config needed (verified empirically). Explicitly added on top: `noFloatingPromises`/`noMisusedPromises` (unhandled/misused promises — relevant given how async-heavy TanStack Query/Form are), `noNestedComponentDefinitions`, `noReactPropAssignments`, `useUniqueElementIds`, `noJsxPropsBind`. `@biomejs/biome` is pinned exactly (no `^`) rather than left floating, because three of the rules above are `nursery`-tier — Biome's explicit "may rename/restabilize/remove" bucket. A floating range meant a routine Dependabot bump could flip `bun run lint` red for reasons unrelated to whatever else was in that PR; pinning turns that into an expected part of the Biome-bump PR's own diff instead.
- **Devtools:** unified `@tanstack/react-devtools` panel (`TanStackDevtools` in `__root.tsx`) hosting Query, Router, and Form devtools in one place, instead of separate floating widgets. `@tanstack/devtools-vite` adds console-log piping between browser/terminal.
- **Git hooks:** lefthook (pre-commit: Biome + typecheck; commit-msg: commitlint / Conventional Commits)
- **CI (`.github/workflows/ci.yml`):** on every push/PR — `bun audit` (fails on high/critical vulnerabilities) → lint → typecheck → test → build. Bun's own package cache (`~/.bun/install/cache`, keyed on `bun.lock`) is cached via `actions/cache`, per [Bun maintainer guidance](https://github.com/oven-sh/bun/discussions/18752) — `node_modules` itself is deliberately *not* cached (Bun regenerates it fresh from its cache every run, which avoids the stale/corrupted `node_modules` class of bug a direct cache can introduce).
- **Accessibility:** `axe-core` run directly against rendered components in tests (see `-index-page.test.tsx`) — not the `vitest-axe` wrapper, which is unmaintained for Vitest 4's type system (its `declare global { namespace Vi }` augmentation doesn't merge with Vitest 4's `declare module 'vitest'` pattern). Tests assert `results.incomplete` is empty as well as `results.violations` — otherwise a check axe can't evaluate (e.g. `color-contrast`, see Known quirks) silently lands in `incomplete` and the test reports "no violations" while never actually running that check.
- **Bundle size budget:** `vite-plugin-bundlesize` fails the build if any JS chunk exceeds 150kB gzip (current: ~100kB main, ~9kB routes) — see the caveat below, it does not enforce CSS despite accepting a `**/*.css` glob. This matters more now than it did under Tailwind: Mantine ships full component CSS regardless of what's used, so the CSS bundle is currently ~34kB gzip (vs. ~5kB under Tailwind's purge-to-usage model) and nothing is watching it.
- **Dependency updates:** Dependabot (`.github/dependabot.yml`) — weekly PRs for `bun` deps (grouped dev/production) and GitHub Actions versions
- **Editor:** `.vscode/settings.json` and `.vscode/extensions.json` are committed (not gitignored) so Biome-as-formatter and native CSS validation (which doesn't understand `postcss-preset-mantine`'s nesting/`$simple-vars` syntax) are consistent for everyone, not just personal config.
- **Infrastructure (`infra/`):** AWS CDK (TypeScript) — private S3 bucket + CloudFront (Origin Access Control, not the legacy OAI) + a `ResponseHeadersPolicy` (CSP/HSTS/frame-options) + SPA fallback via CloudFront error responses. `bunx cdk synth` verified locally; **not deployed** — no AWS account confirmed, no `cdk bootstrap` run yet. See `docs/adr/0007-aws-s3-cloudfront-hosting.md` for the full reasoning, including why the CSP currently needs `style-src 'unsafe-inline'` (Mantine injects runtime `<style>` tags — verified, not assumed).

Full rationale for the non-obvious choices is in `docs/adr/`.

## Directory structure

Currently flat (`src/{routes,lib,hooks}`) since there are no real features yet — just the scaffold. There's no `components/ui/` anymore: Mantine ships its own pre-built components, so there's no owned component source to keep there (unlike the earlier shadcn/ui setup). This is the target convention for when real features land, not a restructure to do preemptively.

**Colocate inside the route, not in a parallel `features/` tree.** TanStack Router's file-based routing already gives colocation for free: prefix a file or folder with `-` and the router excludes it from the route tree while still letting you import it normally.

```
src/routes/
├── posts.tsx
├── -posts-table.tsx      ← colocated, not a route
├── -components/
│   ├── header.tsx
│   └── footer.tsx
```

**Promote to shared space only once something is actually shared.** Start route-local; move to `src/lib/` or `src/hooks/` only when a second route needs it. A `../../../` relative import is the signal something's in the wrong place — it means reaching across route boundaries instead of using the `@/*` alias or promoting the code.

**Cross-cutting concerns get treated like an internal library, not glued in.** If something (a data-fetching layer, a set of generic UI atoms) grows past "shared utility" into its own coherent thing, that's the seam to consider extracting it — relevant if this becomes a monorepo later.

Sources: [TanStack Router — Routing Concepts](https://tanstack.com/router/latest/docs/routing/routing-concepts) · [8 months of TanStack Router in production](https://swizec.com/blog/tips-from-8-months-of-tan-stack-router-in-production/)

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
- **Error tracking** (e.g. Sentry) — zero production observability right now; add before shipping anything real. Bundle source map upload/strip (see Known quirks) belongs here.
- **Deployment target** — decided: AWS S3 + CloudFront via CDK (see `docs/adr/0007-aws-s3-cloudfront-hosting.md`). SPA-fallback routing and a CSP/security-headers policy are built into `infra/`; a per-request nonce for a *stricter* CSP (dropping `unsafe-inline`) is still deferred, along with the build-time-vs-runtime env var strategy for promoting one build across environments — neither is needed until there's a real deploy pipeline and more than one environment.
- **Actually deploying** — `cdk bootstrap`/`cdk deploy` haven't run against any AWS account. Needs: a confirmed AWS account, an OIDC-federated IAM role for GitHub Actions (no long-lived keys), a CI deploy job (`push: main` only, its own concurrency group so an in-flight deploy can't be cancelled by the existing lint/test job's `cancel-in-progress`), and the sourcemap-stripping decision from Known quirks resolved at the sync step.

## Known quirks

- `vite-plugin-bundlesize` v0.3.0 silently ignores `**/*.css` limit entries — verified empirically (set to `1 kB` against a 5kB actual file, build still passed). Only JS chunks are enforced. Re-check this if the plugin gets a version bump.
- `bun.lock`'s trailing commas are intentional (Bun's own JSONC-like lockfile format, chosen for cleaner diffs) — not a bug. `.vscode/settings.json` maps it to the `jsonc` language so editors stop flagging it as a JSON syntax error.
- `src/test/setup.ts` mocks `window.matchMedia` — jsdom doesn't implement it, and Mantine's color-scheme detection (`defaultColorScheme="auto"`) needs it to avoid throwing on mount in every test that renders `MantineProvider`.
- Route components live in colocated `-*.tsx` files (e.g. `src/routes/-index-page.tsx`), not directly in the route file (`src/routes/index.tsx` just imports and wires one up). Exporting a component straight from a route file breaks TanStack Router's `autoCodeSplitting` — it warned explicitly when we tried it. Test files for these follow the same `-` prefix (e.g. `-index-page.test.tsx`) so the router doesn't try to treat them as routes too.
- `axe-core`'s `color-contrast` rule is explicitly disabled in tests, not just left to fail — jsdom has no layout engine (`Range#getClientRects` etc. are stubs, and this is true even with the `canvas` package installed, which only patches image/font metrics, not layout), so the check can never fully evaluate and would otherwise sit in `results.incomplete` forever. Real contrast checking needs a real browser; covered when Playwright E2E lands.
- `bun audit --audit-level=high` in CI has no allowlist for an advisory with no available fix (e.g. a transitive dev-dependency) — Bun has no `.auditignore`-equivalent today. Until one exists, an unfixable high/critical advisory blocks every push/PR regardless of relevance; resolving it is a manual `bun audit --json` triage, not an automatic bypass.
- `build.sourcemap: "hidden"` in `vite.config.ts` only suppresses the `//# sourceMappingURL` comment — the `.js.map` files still get written into `dist/` and are servable if nothing strips them post-build. There's deliberately no strip-or-upload step yet, since that's normally wired up alongside source map upload to an error tracker (see Deferred: Error tracking) once a deployment target exists — don't ship `dist/` as-is to anything public before that lands.
