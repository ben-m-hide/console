# `GET /api/v1/players` (paginated) + `GET /api/v1/seasons`

Build-order step 1 from [`docs/design/frontend-ui-ux.md`](../design/frontend-ui-ux.md) §1. Both routes are prerequisites for the Players screen, and the seasons route additionally unblocks the header scope selector and makes Compare drivable by a human rather than by hand-typed IDs.

## Files touched + why

- `apps/api/src/routes/players.ts` (new) — the paginated list route.
- `apps/api/src/routes/seasons.ts` (new) — season list, optionally filtered by competition.
- `apps/api/src/routes/build-players-query.ts` (new) — pure pagination/filter logic (offset maths, page clamping), unit tested. Mirrors the existing `build-player-compare-entries.ts` split: pure logic gets tests, the `db.select()` call is verified by running it against real data.
- `apps/api/src/index.ts` — register both routes, extend the rate-limiter mounts.
- `apps/api/.claude/skills/run-api/SKILL.md` — add both to the documented smoke path.
- `PROJECT.md` §4 — add the missing seasons endpoint to the table, and correct the `/players` filter list.
- `TODO.md` and `docs/design/frontend-ui-ux.md` — record the API gap as closed.

## Findings that shaped this

**`players` has no team column.** Team association exists only through `player_season_stats` (`playerId` + `teamId` + `seasonId`). So `PROJECT.md` §4's advertised `?team=` filter is inherently **season-scoped** — filtering players by team is meaningless without also naming a season. This is a contract-level consequence, not a detail.

**Offset pagination needs a total order or it is subtly wrong.** Without a deterministic tiebreak, Postgres may return rows in different orders across queries, so paging shows duplicates and silently skips records. Ordering is `name` then `id`.

**Possible rate-limiter gap.** `index.ts` mounts `publicApiRateLimiter` on `/api/v1/players/*`. In Hono that pattern may not match bare `/api/v1/players`, which would leave the new list route unthrottled — the opposite of what we want, since a list endpoint is the more attractive thing to hammer. **Verify empirically, do not assume.** `/api/v1/seasons` needs its own mount either way.

## Approach

**Query parameters:** `search`, `position`, `page`, `pageSize`.

- `search` — case-insensitive substring match on `name`, which is what a player picker needs.
- `position` — exact match on the column.
- `page` — 1-based, `.catch(1)` so a malformed value degrades rather than 400s.
- `pageSize` — default 25, **hard cap 50**, so nobody can request the whole table.

**`team` deliberately not implemented.** It needs a season parameter to mean anything (see findings), and no screen consumes it yet. `PROJECT.md` §4 is corrected rather than left advertising something the route does not do.

**Sorting deliberately not implemented.** The Players screen can ship name-ordered. Which columns are worth sorting by is better decided against a real table than guessed now. Deterministic default ordering is still required, for the correctness reason above.

**Response shape — an envelope, for paginated routes only:**

```jsonc
{ "data": [...], "meta": { "page": 1, "pageSize": 25, "total": 698, "totalPages": 28 } }
```

`total` is what the frontend needs to render pagination at all. `/competitions` keeps returning a bare array — the envelope is specifically what pagination requires, not a new house style. This is a real inconsistency in the API surface, so `PROJECT.md` §4 records which shape applies when.

**Seasons: flat `GET /api/v1/seasons?competition=`**, not nested under `/competitions/:id`. The consumer is the header scope selector, which may need seasons before any competition is chosen; a flat route serves both cases in one call. Returns a bare array — the season count is small and bounded, so it is not paginated.

### Alternatives considered

- **Nested `/competitions/:id/seasons`** — more consistent with the already-planned `/competitions/:id/fixtures`, and more conventionally RESTful. Rejected because it forces a competition choice the scope selector does not always have. A genuine trade-off, recorded rather than glossed.
- **Cursor pagination** — better for large or rapidly-changing datasets. Rejected: 698 rows that only change when ingestion runs every few hours, and the frontend design wants a bookmarkable `?page=` with jump-to-page, which cursors do not give.
- **Bare array plus an `X-Total-Count` header** — avoids the envelope inconsistency. Rejected as less discoverable in the OpenAPI document and awkward to consume through the fetch/`safeParse` boundary the frontend already uses.

## Test/type impact

- New unit tests for `build-players-query.ts`: offset maths, page clamping at both ends, `pageSize` cap enforcement, filter composition with none/one/both filters.
- Route handlers' DB access verified by running them against the real `local-dev` branch, matching the existing split.
- `packages/shared` already generates `PlayerSchema` and `SeasonSchema` from Drizzle — reused for response validation, not re-declared.
- New response envelope needs its own schema; it is API-shaped rather than table-shaped, so it lives in the route file (tier 1 of `docs/conventions/typescript.md`'s "where types live") until a second consumer exists.

## Migration/breaking-change risk

Low. Two additive routes. No database change, no change to any existing route's contract.

## Rollback plan

Plain revert. Nothing external is touched, no migration to undo.

## Verification

1. Full pipeline — lint, typecheck, test, build, `bun audit`, **and `bun run e2e`**.
2. Real requests against the real `local-dev` data: default page, an explicit page, the last page, a page past the end, `pageSize` above the cap, a `search` hit and a miss, a `position` filter, and both filters together.
3. **Confirm the rate limiter actually applies to bare `/api/v1/players`** — the specific thing flagged above as unverified.
4. `/doc` still generates, and both routes appear in `/reference`.

## Known limits, recorded deliberately

Only 698 players exist, all Premier League, one finished season — so pagination is barely exercised by real data. Boundary cases get tested explicitly rather than trusted.
