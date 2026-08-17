# Adopt wretch as the API-client transport layer

## Context

`apps/web`'s two query modules (`-queries/competitions.ts`, `-queries/players.ts`) hand-roll `fetch` calls with duplicated base-URL/error-handling logic. `docs/design/frontend-architecture.md` §9 left "generate the API client from OpenAPI, or hand-write one?" as an open question. Investigated a reference project's much larger `m3ter-api` package (wretch + a generic `DataType`-driven CRUD engine for ~80 resources) to see which ideas generalize down to this project's 4 endpoints.

## Decision

Hand-written, using `wretch` for transport/error-handling, `packages/shared`'s existing Zod schemas for response validation (unchanged). Resolves the open question in the design doc: hand-write, don't generate — this project has too few endpoints for codegen to pay for itself, and Zod schemas already do the type/validation job a generator would otherwise produce.

Explicitly **not** ported from the reference project: `DataType` enum/entity mapped-type, the declarative CRUD-engine config table, the relationship-graph hydration engine, the custom search-query DSL — all solve problems specific to a ~80-resource enterprise API, not a 4-endpoint app.

## Files touched + why

**New:**

- `apps/web/src/lib/api-client.ts` — configured `wretch` instance, `ApiError` class, `isApiError` guard.
- `apps/web/src/lib/api-client.test.ts` — unit tests for error mapping.

**Edited:**

- `apps/web/src/routes/-queries/competitions.ts`, `-queries/players.ts` — use the client instead of raw `fetch`.
- `apps/web/package.json` — add `wretch`, pinned exact (`"3.0.9"`, no `^`) — new dependency, no `bun audit` allowlist safety net, matches this project's pinning policy for exactly this case.
- `apps/web/src/routes/-index-page.test.tsx` — the one existing `"Request failed: 500"` assertion changes to match `ApiError`'s real message.
- `docs/design/frontend-architecture.md` §6/§9 — resolve the open question, record the decision.
- New `docs/adr/0016-wretch-for-api-client.md`.
- `TODO.md` — check off the "Generated API client" fired-trigger item.

## Approach

- No wretch addons — core `wretch` covers everything needed (`.url()`, `.options({ signal })`, `.get()`/`.json()`). Query-string building stays as manual `URLSearchParams` interpolated into the URL, same as today.
- Error mapping via `.catcherFallback()`: non-2xx responses and network failures both route through one fallback that throws `ApiError extends Error` (message, status). Verified empirically against `wretch@3.0.9` (not the reference project's pinned `2.9.0`):
  - A real `Response` with the API's actual `{ error: { code, message } }` envelope round-trips through wretch's default error body read; `.customError()`/error-body parsing extracts the real `message` field.
  - A network failure (fetch throws) still reaches `.catcherFallback()`, with `status` absent.
  - `.options({ signal })` passes an existing `AbortSignal` (the one TanStack Query's `queryFn({ signal })` provides) straight through to the underlying `fetch` call — confirmed via direct test, not documentation.
  - wretch 3.0.9's error path tolerates the plain-object `{ ok, status, json }` test mocks already used in this repo's route tests (no `.text()`/`.clone()`/`.statusText` needed) — **no mock migration required**, reversing an earlier concern based on testing against the reference project's older pinned version.
- Response validation is unchanged: `safeParse` against `packages/shared`'s Zod schemas immediately after `.json()`. wretch does zero runtime validation of its own — confirmed the reference project doesn't either (a gap there, not a pattern to copy).

## Test/type impact

- New `api-client.test.ts`: `ApiError` mapping for a real error envelope, a network failure, and a success passthrough.
- Existing route/page tests: no mock-shape changes needed (verified above). One assertion (`-index-page.test.tsx`'s `"Request failed: 500"`) updates to the new `ApiError` message text.
- Full pipeline (lint/typecheck/test/build/`bun audit`) re-run before calling this done.

## Migration/breaking-change risk

Low — frontend-only, no deployed surface, no external users. The one observable change is the exact error-message string shown in the error state UI.

## Rollback plan

Single branch/commit; `git revert` if needed. No schema/data migration.
