# `apps/api` architecture review — reorg, relation graph, contract DRY-up

## Context

`apps/api` grew as flat `src/routes/*.ts` files (per-entity prefix naming) plus two `build-*.ts` pure-logic helpers. Fine at 4 routes; PROJECT.md Phase 5 roadmap adds `/competitions/:id/fixtures`, `/fixtures/:id/report`, `/players/:id/stats`, `/teams/:id/stats` — two new domains (fixtures, teams) and deeper nesting, which flat prefix-named files don't scale into.

Researched (not guessed): Hono community guidance (honojs/hono#4121 and others) recommends domain/feature folders over technical-layer folders for Hono+zod-openapi apps — matches this repo's own `apps/web` colocation convention (query factories, page components living with their feature). `docs/conventions/typescript.md`'s "Where types live" promotion rule (inline → co-located file on 2nd consumer → `packages/shared` on 2nd app) applies throughout.

Separately, the user flagged the actual near-term need driving all of this: complex cross-entity queries (players↔teams, competitions↔seasons↔fixtures, stats tying player+team+season together) are coming, and `packages/shared`/`packages/db` should be a genuine single source of truth for contracts shared across apps, not independently hand-duplicated per app.

Confirmed, not assumed: installed `drizzle-orm@0.45.2` (checked the installed package's own `.d.ts`, not docs alone) ships the **classic** `relations()` API (`fields`/`references`), not the newer `defineRelations()` (a 1.0+ API this repo isn't on).

Three parts, sequenced as three separate commits/PRs:

1. `apps/api` reorg (this part ships first, independent of 2/3).
2. `packages/db` relation graph (additive, zero consumers, safe alone).
3. `packages/shared` composite/envelope schema tier + `apps/api`/`apps/web` consuming it (land together — two sides of one contract change).

---

## Part 1 — `apps/api` internal reorg

### Files touched

```
src/routes/index.ts                         → src/routes/index.ts (imports updated only)
src/routes/competitions.ts                  → src/routes/competitions/list-route.ts
src/routes/seasons.ts                       → src/routes/seasons/list-route.ts
src/routes/players.ts                       → src/routes/players/list-route.ts
src/routes/build-players-query.ts (+test)   → src/routes/players/list-query.ts (+test)
src/routes/players-compare.ts               → src/routes/players/compare-route.ts
src/routes/build-player-compare-entries.ts (+test) → src/routes/players/compare-entries.ts (+test)
NEW  src/routes/players/compare-query.ts    — extracted, pure request-query parsing (below)
NEW  src/routes/players/compare-fetch.ts    — extracted DB-fetch phases (below); kept separate
                                               from compare-query.ts so the pure/tested file
                                               never transitively imports @console-next/db
                                               (which pulls in drizzle-orm/bun-sql's `bun`
                                               module — breaks under Vitest, see
                                               apps/api/scripts/check-openapi.ts's own comment)
NEW  src/middleware/error-envelope.ts       — shared `{ error: {code,message} }` builder
NEW  src/lib/positive-integer-param.ts      — shared strict positive-int query validator
```

Kept as-is: `src/db.ts` (single client, not a feature), `src/middleware/` (genuinely cross-cutting), `src/index.ts` (composition root). Kept dir name `routes/` not `features/` — every file in there really is an HTTP route (unlike `apps/web`'s `src/routes/`, which is TanStack's file-based UI routing).

### Approach

**Domain subfolders under `src/routes/`** (`competitions/`, `seasons/`, `players/`) — group by feature, not technical layer.

**Split oversized handlers into named functions**, extending patterns already in the codebase, not inventing new ones:

- `players/list-route.ts`: extract `buildPlayerFilters(search, position): SQL | undefined` into `list-query.ts`, alongside the already-extracted `resolvePagination`/`resolveSort` — today filter-building is the one piece of query logic still inline while its siblings aren't.
- `players/compare-route.ts` (currently ~70-line handler doing 5 things inline): extract `parseCompareQuery(ids, season)` into new, pure `compare-query.ts`, and `fetchRequestedRows(db, seasonId, playerIds)`/`fetchPeerGroupsByPosition(db, seasonId, positions)` into new `compare-fetch.ts`. Handler shrinks to parse → fetch rows → 404-check → fetch peers → `buildCompareEntries` → `json`.
- Route/register naming made consistent across the domain folders: every route that's actually a list route is named as one end-to-end — `competitionsListRoute`/`registerCompetitionsListRoute`, `seasonsListRoute`/`registerSeasonsListRoute`, `playersListRoute`/`registerPlayersListRoute`. `playersCompareRoute`/`registerPlayersCompareRoute` stays as-is — it isn't a list route.

**DRY, kept deliberately narrow (two separate findings, not merged):**

- Error envelope `{ error: { code, message } }` hand-built independently in `error-handler.ts` (×2) and `rate-limiter.ts` → one `errorEnvelope(code, message)` in `middleware/error-envelope.ts`. Stays inside `middleware/` — both consumers already live there.
- Positive-integer query-param validation has **two different philosophies**, only one gets consolidated: strict/reject (`seasons.ts`'s `competition`, `players-compare.ts`'s `season` — each a hand-rolled `/^\d+$/` regex, real duplicate) → `src/lib/positive-integer-param.ts`. The lenient/clamp one (`build-players-query.ts`'s `parsePositiveInteger`, deliberately degrades instead of 400ing) stays separate — collapsing the two contracts into one function would violate simplicity-first, not satisfy it.
- Included: batch `fetchPeerGroupsByPosition`'s per-position sequential DB queries into one `inArray(players.position, positions)` query, grouped client-side — natural side effect of extracting that function anyway, behavior-preserving.

### Test/type impact

All moved files keep colocated `*.test.ts` (import-path updates only). New coverage for previously-untested pure logic, added in this same change (not a fast-follow): `buildPlayerFilters`, `parseCompareQuery`, `errorEnvelope`. `fetchRequestedRows`/`fetchPeerGroupsByPosition` stay untested, deliberately — same reasoning `TODO.md` already documents for `players-compare.ts`'s existing `db.select()` calls (avoids a DB-mocking abstraction this project has consistently rejected elsewhere). No route has HTTP-level tests today (PROJECT.md Phase 5 tracks this separately) — out of scope, not made worse.

### Migration/breaking-change risk

None externally — no route paths, schemas, or response shapes change. Internal import-path churn only.

### Rollback

Single commit, `git revert`.

---

## Part 2 — `packages/db`: define the relation graph

### Files touched

Colocate `<table>Relations` in each existing schema file (same one-file-per-table locality as today): `competition.ts`, `season.ts`, `team.ts`, `fixture.ts`, `player.ts`, `player-season-stats.ts`, `squad-membership.ts`. `client.ts` unchanged.

### Approach

Graph (players ↔ fixtures ↔ teams ↔ seasons ↔ competitions ↔ stats):

- `competitions` → many `seasons`
- `seasons` → one `competition`; many `fixtures`, `playerSeasonStats`, `squadMemberships`
- `teams` → many `fixtures` **as home / away** (needs `relationName` — verified via Drizzle docs, real disambiguation requirement for two FKs to the same table, not glossed over); many `playerSeasonStats`, `squadMemberships`
- `fixtures` → one `season`, one `homeTeam`, one `awayTeam` (matching `relationName`s)
- `players` → many `playerSeasonStats`, `squadMemberships`
- `playerSeasonStats` / `squadMemberships` → one `player`, one `team`, one `season`

`schema/index.ts` already barrel-exports everything into one `schema` object passed to `drizzle({ schema })` in `client.ts` — Drizzle auto-discovers `relations()` exports mixed in with table exports, so `db.query.<table>.findMany({ with: {...} })` becomes available with no other wiring change.

**Deliberately not done here:** migrating `players-compare.ts`'s existing hand-rolled `innerJoin` chain to the new relational-query API — see Unresolved Questions / `TODO.md`.

### Test/type impact

Additive/declarative — `tsc -b`/lint is the real check. A live `findMany({ with })` exercise would need the real `local-dev` Neon branch, which needs explicit confirmation per this project's DB guardrail — not done as part of this change unless separately approved.

### Migration/breaking-change risk

None — purely additive, zero existing query changed.

### Rollback

Single commit, `git revert`.

---

## Part 3 — `packages/shared`: composite + envelope schema tier, consumed by `apps/api` + `apps/web`

### Context / concrete duplication found

`packages/shared` today is 100% code-generated 1:1 from Drizzle tables (ADR 0013), by design, for flat entity schemas — composite/joined shapes aren't derivable that way. Separately, a real duplication exists **today**: `apps/api/src/routes/players.ts`'s `PlayerListResponseSchema`/`PlayerPageMetaSchema` and `apps/web/src/queries/players/players.ts`'s local `PlayerListResponseSchema` + `@/routing`'s `ListMetaSchema` are two independently hand-rolled copies of the identical `{ data, meta: { page, pageSize, total, totalPages } }` wire shape.

### Files touched

```
packages/shared/src/schemas/
  <entity>.gen.ts     (unchanged — generated tier stays as-is)
  envelope.ts         (NEW, hand-written) — ListResponseSchema(item), PaginationMetaSchema,
                       PaginatedListResponseSchema(item), ErrorEnvelopeSchema
  composite/          (NEW, empty until a real nested route needs one — see below)
NEW docs/adr/00XX-shared-composite-and-envelope-schemas.md

apps/api/src/routes/players/list-route.ts, competitions/route.ts, seasons/route.ts
  — response schemas import from @console-next/shared instead of hand-building
apps/api/src/middleware/error-envelope.ts (from Part 1)
  — return type checked against shared ErrorEnvelopeSchema's inferred type

apps/web/src/queries/players/players.ts, competitions/competitions.ts
  — local response schemas replaced with imports from @console-next/shared
apps/web/src/routing (ListMetaSchema) — retired, superseded by shared PaginationMetaSchema
```

### Approach

`envelope.ts` is generic and built now — the duplication it fixes is real, not speculative. `composite/` (e.g. a future `PlayerWithTeamSchema`, `CompetitionWithSeasonsSchema`) stays **empty until a real route needs one** — building it for the whole graph now would be speculative machinery this project's simplicity-first rule rules out.

This extends ADR 0013's stated scope ("Drizzle is canonical; Zod schemas are generated from it") rather than fitting inside it — new ADR, referencing 0013, not an amendment to it (matches how ADR 0008 handled its own superseded sub-decision: an addendum note, original left intact).

Does not reopen ADR 0016 (wretch, hand-written API client) — 0016's own "revisit if" triggers (API surface grows meaningfully, an OpenAPI generator evaluated against `@hono/zod-openapi` shows real DX gains) aren't hit by this; this is a narrower fix for one piece of accidental duplication 0016 didn't anticipate at 2–3 endpoints, not a reversal of "hand-written, not generated."

Future nested routes (`/players/:id/stats`, `/teams/:id/stats`, `/competitions/:id/fixtures`) use Part 2's relational-query API + a `composite/` schema built at that time, instead of hand-rolled joins — `players-compare.ts`'s existing manual joins are the pattern every future nested route would otherwise re-invent by hand.

### Test/type impact

New parse tests for `envelope.ts` (success/failure cases), same rigor as existing `schemas.test.ts`. `apps/api`/`apps/web` existing tests get mechanical import/expected-shape updates — no behavior change, response bodies stay byte-identical (`{ data }` / `{ data, meta }` / `{ error }` shapes preserved exactly).

### Migration/breaking-change risk

None externally — zero API-shape/route-path changes, purely where the shape's definition lives.

### Rollback

Single commit per Part 3 (schema tier + both consuming apps land together), `git revert`.

---

## Self-critique / risks

- Composite-schema tier is new territory for this repo — no precedent for "hand-written Zod schema composing generated ones." Mitigated by only building one per real route, not the whole graph speculatively.
- `relationName` disambiguation on fixtures↔teams (home/away) needs to actually typecheck against the installed `drizzle-orm@0.45.2`, not just match the docs pattern — verify for real during Part 2, don't assume the docs example ports 1:1.
- Real tension between "well-thought structure now" (user's ask) and "surgical changes" (project rule) on whether to migrate `players-compare.ts` to the new relational API immediately — resolved below by deferring it explicitly, not silently.

## Unresolved questions — resolved 2026-08-19

1. Migrate `players-compare.ts`'s existing manual joins to the new relational-query API now, or later? **Resolved: later, but tracked as a high-priority follow-up** (touching tested/working code purely for consistency contradicts "surgical changes"; the new API should prove itself on the next new nested route first). Tracked in `TODO.md` under Backend.
2. New ADR for the composite/envelope tier, or amend 0013? **Resolved: new ADR**, referencing 0013.
3. Build composite schemas for the full graph now, or per-route as needed? **Resolved: per-route.** Only `envelope.ts` ships in Part 3; `composite/` starts empty.
