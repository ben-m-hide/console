# Hand-written envelope schemas in `packages/shared`, additive to ADR 0013's generated tier

## Status

Accepted — built and verified. `packages/shared/src/schemas/envelope.ts` exists, is consumed by all three of `apps/api`'s list routes and both of `apps/web`'s list query modules, and both apps' local duplicates of the shapes it replaces are deleted, not kept as compatibility shims.

## Context

ADR 0013 made `packages/shared`'s Zod schemas 100% code-generated 1:1 from `packages/db`'s Drizzle tables — deliberately scoped to flat per-entity shapes only, since that's exactly what a Drizzle table introspects into. Real duplication has since appeared that this generated tier structurally cannot cover, because it isn't per-entity: it's the wire _envelope_ shapes wrapping those entities, which don't correspond to any single Drizzle table.

Found in this session, as part of `docs/plans/2026-08-19-api-architecture-review.md`'s Part 3:

1. **Pagination meta** (`{ page, pageSize, total, totalPages }`) was hand-rolled independently in `apps/api/src/routes/players/list-route.ts` (as `PlayerPageMetaSchema`) and in `apps/web/src/search-params/search.ts` (as `ListMetaSchema`/`ListMetaParams`) — the latter consumed not just by the players query module but by the generic `DataTable.tsx` component, its test file, and a shared test fixture (`test/data/route-fixtures.ts`).
2. **The list-response envelope** (`{ data: [...] }`, with `meta` added only for paginated routes) was hand-rolled independently in `apps/api`'s `competitions/list-route.ts`, `seasons/list-route.ts`, and `players/list-route.ts`, and again independently in `apps/web`'s `queries/competitions/competitions.ts` and `queries/players/players.ts`.
3. **The error envelope** (`{ error: { code, message } }`) was hand-rolled in `apps/api/src/middleware/error-envelope.ts` (already consolidated to one function within `apps/api` by an earlier commit on this same branch), and separately — as a narrower subset missing `code` entirely — in `apps/web/src/lib/api/utils/error.ts`'s `ApiErrorSchema`, used to parse the API's real error response body when mapping a thrown fetch error to a user-facing message.

Each of these is the same shape, defined by hand on both sides of the same HTTP boundary, with nothing forcing them to stay in sync.

## Decision

Add a second, **hand-written** schema tier to `packages/shared/src/schemas/`, alongside (not replacing) ADR 0013's generated `*.gen.ts` tier: `envelope.ts`, holding `PaginationMetaSchema`, two generic factory functions — `listResponseSchema(itemSchema)` and `paginatedListResponseSchema(itemSchema)` — and `ErrorEnvelopeSchema`.

**Why a hand-written file, not an extension of ADR 0013's generator:** that generator derives a schema from a single Drizzle _table_. An envelope isn't a table — it's a shape that wraps one or more entity schemas — so there's nothing for the generator to introspect. This is a genuinely different kind of thing needing its own tier, not a gap in the existing generator.

**Why generic factory functions, not one schema per entity:** the entire point is one implementation instead of N per-entity copies. A factory taking the item schema as a parameter is the natural way to cover every current and future list/paginated-list endpoint without repeating the wrapper shape. They're named camelCase (`listResponseSchema`, not `ListResponseSchema`) because they're functions that _produce_ a schema, not a schema constant themselves — matching the existing `createSortableSearchSchema` precedent in `apps/web`.

**A real technical wrinkle, resolved during implementation:** this project's Biome config enforces `nursery.useExplicitReturnType`, and TypeScript can't be told to infer the exact `z.ZodObject<...>` shape cheaply as a return-type annotation. Both factories are annotated with the simpler, still-accurate `z.ZodType<{ ... }>` describing the schema's parsed output shape, rather than pinning down zod v4's internal `ZodObject` generic. Verified this doesn't lose anything real: `@hono/zod-openapi`'s `.openapi()` method is added via ambient module augmentation on the shared `ZodType` interface (not `ZodObject` specifically), so it stays callable on the narrowed return type inside `apps/api` — confirmed via `apps/api`'s own `tsc -b --noEmit` passing clean after wiring this through all three list routes.

## What was actually built

- `packages/shared/src/schemas/envelope.ts` — `PaginationMetaSchema` (+ inferred `PaginationMeta` type), `listResponseSchema`/`paginatedListResponseSchema`, `ErrorEnvelopeSchema` (+ inferred `ErrorEnvelope` type).
- `packages/shared/src/schemas/envelope.test.ts` — colocated tests, following this project's per-file convention rather than folding into `schemas.test.ts` (which is explicitly scoped to the generated tier by its own describe-block naming). 17 assertions across the package now.
- `packages/shared/src/schemas/index.ts` — one more barrel line, `export * from "./envelope"`, alongside the `*.gen.ts` exports.
- `apps/api/src/routes/{competitions,seasons,players}/list-route.ts` — each now calls `listResponseSchema`/`paginatedListResponseSchema` instead of hand-building its own `{ data }`/`{ data, meta }` object schema. `players/list-route.ts`'s separate `PlayerPageMetaSchema` is gone entirely.
- `apps/api/src/middleware/error-envelope.ts` — its local `ErrorEnvelope` interface is gone; the type is imported from `@console-next/shared` instead. The `errorEnvelope()` builder function itself is unchanged.
- `apps/web/src/queries/{competitions/competitions,players/players}.ts` — each now calls `listResponseSchema`/`paginatedListResponseSchema` instead of hand-building its own schema.
- `apps/web/src/search-params/search.ts` — `ListMetaSchema`/`ListMetaParams` are **deleted outright**, not kept as a re-exporting shim. `DataTable.tsx`, `DataTable.test.tsx`, and `test/data/route-fixtures.ts` now import the shared `PaginationMeta` type instead.
- `apps/web/src/lib/api/utils/error.ts` — its local `ApiErrorSchema` is deleted, replaced by parsing directly against the shared `ErrorEnvelopeSchema`. This is a real strengthening, not just deduplication: the old local schema never required a `code` field at all.

Verified, not assumed: the full pipeline (lint/typecheck/test/build/`bun audit`) passed repo-wide after every step above. `apps/api`'s smoke test against the real `local-dev` Neon branch confirmed all three routes' response bodies are byte-identical in shape to before this change (`{ data }`, `{ data, meta }`, `{ error: { code, message } }`) — this was a pure refactor of _where_ the schema is defined, not a wire-format change. Both `apps/api` and `apps/web` dev servers were started for real and `/players` was driven in an actual Chromium tab: the table rendered real paginated data (80 total pages from a real total of 1,991 players), clicking to page 3 correctly navigated and re-rendered with different real rows, and the browser console had zero errors — confirming `DataTable.tsx`'s switch from the deleted local `ListMetaParams` type to the shared `PaginationMeta` type didn't break anything at runtime.

## Consequences / known gaps, deliberately not resolved here

- **A "composite" entity tier stays unbuilt.** A future joined shape (e.g. `PlayerWithTeamSchema`, once `packages/db`'s new Drizzle `relations()` graph — added in the prior commit on this branch — backs a real nested route) has no home yet. No `packages/shared/src/schemas/composite/` directory exists either — an empty directory can't be committed to git, and there's no real schema to put in one yet, so this is a deliberate non-action, not an oversight. Build it, and the directory, on the first real nested route that needs one.
- **`apps/api`'s per-entity OpenAPI component naming changed slightly.** Before this change, `players/list-route.ts` gave the pagination-meta sub-schema its own named OpenAPI component (`PlayerPageMeta`). `paginatedListResponseSchema`'s `meta` field uses the shared `PaginationMetaSchema` without a per-call `.openapi()` name, so it now renders inline in the generated `/doc` spec rather than as a separate reusable component. This is intentional, not a regression: a per-entity-named copy of the same shape is exactly the duplication this ADR removes; `check-openapi.ts`'s test only checks path count/version, not component shapes, and nothing else depends on that component existing.
- **`docs/plans/2026-08-19-api-architecture-review.md`'s Part 3 already tracks the still-open follow-up** (migrating `apps/api/src/routes/players/compare-route.ts`'s hand-rolled joins onto `packages/db`'s relational-query API) in `TODO.md` — unrelated to this ADR's scope, noted here only so it isn't mistaken for something this ADR should have covered.

## Considered and rejected

- **Extending ADR 0013's generator to also produce envelope shapes** — rejected: the generator's whole mechanism is introspecting a single Drizzle table's columns; an envelope wraps a schema (or several), it isn't one, so there's nothing to introspect. Forcing this in would mean bolting a second, unrelated code path onto a generator that's currently doing one job well.
- **One schema per entity** (e.g. hand-written `PlayerListResponseSchema`, `CompetitionListResponseSchema`, ... in `packages/shared`, still one per entity but at least centralized) — rejected: this still duplicates the same wrapper shape once per entity, just in one file instead of two. The generic factory functions are strictly less code and automatically cover every future entity with zero new lines.
- **A re-exporting compatibility shim for `ListMetaSchema`/`ApiErrorSchema`** (keep the old names as aliases pointing at the new shared schemas, to avoid touching every call site) — rejected per this project's standing rule against backwards-compatibility shims for a purely internal rename with no external consumers; every call site was updated directly instead.
