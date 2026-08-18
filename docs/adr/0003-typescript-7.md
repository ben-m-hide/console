# TypeScript 7 (native compiler)

console-next targets TypeScript 7, the native-compiler rewrite (`tsc`/`tsc -b` on the Go-ported checker), pinned via `typescript@^7.0.2`. We initially assumed this was ahead of general availability, but checking the npm registry directly on 2026-08-07 showed `typescript`'s `latest` dist-tag is already `7.0.2`, i.e. TS 7 is the current mainline release, not a preview. One real breaking change we hit: TS 7 removed the `baseUrl` compiler option entirely (`TS5102`); path aliases now resolve directly from `paths` without it. Worth revisiting if third-party tooling (editor language services, type-aware lint integrations) turns out to lag behind the native compiler.

## Update 2026-08-18: confirmed tooling-lag risk — `typescript-eslint` doesn't support TS 7

The risk flagged above materialized while investigating adding `@tanstack/eslint-plugin-query`/`-router` (see `TODO.md`). `@typescript-eslint/parser` — the only TS-aware ESLint parser, and a hard dependency of any TS/TSX ESLint setup, typed or not — throws at **module load time** under `typescript@^7.0.2`, before parsing a single file:

```
typescript-eslint does not support TS 7.0.
```

Confirmed against both the current stable (`8.67.0`) and canary (`8.67.1-alpha.4`) releases, in an isolated reproduction, not assumed from docs. Tracked upstream, open, no ETA: [typescript-eslint#10940](https://github.com/typescript-eslint/typescript-eslint/issues/10940).

TypeScript's own migration guide documents a "run side-by-side with TypeScript 6.0" workaround (aliasing the `typescript` package to `@typescript/typescript6`, a compat shim wrapping the classic checker, while keeping `tsc` itself on the real 7.x binary via a second alias). Attempted this exact recipe under Bun: `tsc -b` correctly stays on the real 7.0.2 binary (the compat package ships a `tsc6` binary, not `tsc`, so nothing shadows it), but `require('typescript')` resolution hits a self-referencing install — the shim's own nested `"npm:typescript@^6"` dependency resolves back onto itself instead of a real classic-engine build, leaving `ts.versionMajorMinor` undefined and the parser crashing anyway. A scoped `overrides` pin to break the cycle didn't take. Whether this is a Bun-specific resolver gap or an issue with the recipe itself outside npm is unconfirmed — not investigated further, out of scope for what was a lint-plugin task.

**Consequence:** no ESLint-based tooling requiring TS/TSX parsing is usable in this repo until `typescript-eslint` ships TS 7 support. This blocks the whole parser, not just type-aware rules — plain AST-only rules are equally blocked, since the version check runs unconditionally on import.
