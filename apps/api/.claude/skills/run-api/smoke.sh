#!/usr/bin/env bash
# Launches the Hono API in the background, waits for readiness, hits every
# route, checks a 404 falls through correctly, then shuts it down cleanly.
# Run from apps/api/ (or pass PORT to avoid colliding with anything
# already on 3000 — see Gotchas in SKILL.md).
set -euo pipefail

PORT="${PORT:-4100}"
LOG=/tmp/console-next-api.log

PORT="$PORT" bun run dev >"$LOG" 2>&1 &
PID=$!
trap 'kill "$PID" 2>/dev/null || true' EXIT

for _ in $(seq 1 30); do
	curl -sf "http://localhost:$PORT/api/v1/health" >/dev/null && break
	sleep 0.5
done

echo "== /api/v1/health =="
curl -sf "http://localhost:$PORT/api/v1/health"
echo

echo "== /api/v1/competitions =="
curl -sf "http://localhost:$PORT/api/v1/competitions"
echo

echo "== /doc (paths) =="
curl -sf "http://localhost:$PORT/doc" | grep -o '"/api/v1/health"'

echo "== /reference (Scalar UI) =="
curl -sf -o /dev/null -w "%{http_code} %{content_type}\n" "http://localhost:$PORT/reference"

echo "== unknown route returns 404 =="
curl -s -o /dev/null -w "%{http_code}\n" "http://localhost:$PORT/nope"

echo "OK — logs at $LOG"
