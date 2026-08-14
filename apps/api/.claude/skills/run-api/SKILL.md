---
name: run-api
description: Build, run, and smoke-test the console-next backend (apps/api, a Hono REST API). Use when asked to start the API, run its smoke test, verify it's up, or check /api/v1/health, /api/v1/competitions, /doc, or /reference.
---

Hono API, no separate build step (Bun runs the TypeScript directly). Drive it via `.claude/skills/run-api/smoke.sh` — launches the dev server in the background, waits for readiness, hits every route, shuts down cleanly.

All paths below are relative to `apps/api/` (this unit — a sibling `run-console` skill covers the frontend at the repo root).

## Prerequisites / Setup

`bun install` from the repo root installs this workspace package too (Bun doesn't hoist deps here; see the root README's Known quirks). Since `/api/v1/competitions` landed, this package also needs a real `DATABASE_URL` (pooled Neon string — see `.env.example`) to boot; without it `src/db.ts` throws on startup.

## Build

None. `bun run dev` runs `src/index.ts` directly.

## Run (agent path)

```bash
cd apps/api
./.claude/skills/run-api/smoke.sh
```

Exits non-zero if `/api/v1/health` never comes up within 15s, or if any `curl -f` fails. Logs land at `/tmp/console-next-api.log`.

To drive it manually instead of the script:

```bash
PORT=4100 bun run dev > /tmp/console-next-api.log 2>&1 &
PID=$!
curl http://localhost:4100/api/v1/health         # → {"status":"ok"}
curl http://localhost:4100/api/v1/competitions   # → real rows from the local-dev Neon branch
curl http://localhost:4100/doc                   # → OpenAPI 3.1 document
curl http://localhost:4100/reference             # → Scalar API reference (HTML)
kill $PID                                        # confirmed to actually free the port — see Gotchas
```

## Run (human path)

`bun run dev` (from `apps/api/`) — same command, just don't background it. Ctrl-C to stop.

## Test

No test suite exists yet for this package (deliberate — see `docs/adr/0008-hono-rest-openapi-backend.md`; add one when there's real behavior worth testing, then update this section).

## Gotchas

- **Port 3000 (Bun's/Hono's default) can already be bound by something else on this machine without a bind error.** Hit this directly: another process was listening on `[::1]:3000` (IPv6 loopback-only) while this app's `bun` process bound `*:3000` (all interfaces) — both "succeeded," and `curl localhost:3000` silently reached the _other_ process (its `/health` returned someone else's HTML, not this API's JSON). No crash, no port-in-use error — just a wrong response that looks superficially plausible. Always launch with an explicit distinct `PORT` (the smoke script defaults to `4100`) rather than trusting the bare default port is actually free.
- **`/health` moved to `/api/v1/health`** once PROJECT.md §4's versioning decision applied to real routes — `/doc`/`/reference` stayed unversioned (dev tooling, not part of the public API surface it documents).
- **The default export in `src/index.ts` is what makes `bun run` auto-serve it** — `export default app` where `app` has a `.fetch` method is enough for Bun to start an HTTP server itself; there's no explicit `Bun.serve()` call in this codebase. `PORT` env var is respected for this automatically (confirmed by testing, not assumed) — no code change needed to override it.
- **`bun run --watch src/index.ts` is a child of the `bun run dev` wrapper** (`ppid` confirmed via `ps`), and killing the wrapper's PID (`$!` from the background launch) successfully frees the port — unlike npm, which doesn't forward signals to what it spawns. `kill $!` alone is sufficient here; a port-based fallback (`lsof -ti:$PORT -sTCP:LISTEN | xargs -r kill`) isn't needed but is a safe belt-and-suspenders if the process tree ever changes.
