# wretch for the API-client transport layer, hand-written not generated

## Status

Accepted — built. `apps/web/src/lib/api/` (`api-error.ts`, `api-client.ts`, `types/requests.ts`, `utils/{error,params,path}.ts`) is used by both `-queries/competitions.ts` and `-queries/players.ts`.

## Context

`docs/design/frontend-architecture.md` §6/§9 recorded "generate the API client from OpenAPI, or hand-write one?" as an open question when the Players screen crossed the "third endpoint, or first copy-pasted base URL/error handling" trigger. That trigger fired but was left unresolved — `-queries/competitions.ts` and `-queries/players.ts` each hand-rolled their own `fetch` call, base URL fallback, manual `URLSearchParams` construction, and `!response.ok` check, with error messages that threw away the API's own `{ error: { code, message } }` envelope (`apps/api`'s `error-handler.ts`) in favour of a generic `Request failed: ${status}`.

Investigated a much larger reference project's `packages/m3ter-api` (an ~80-resource enterprise API client) for ideas worth porting. It uses `wretch` for transport, structured as `client/index.ts` (an `ApiClass` singleton with `configure()`, a `getClient()` request builder, and verb functions) + `client/api-error.ts` (the error type), plus `util/path.ts`/`util/params.ts` helpers, a `types/requests.ts` param-shape file, and — separately — a large generic `DataType`-enum-driven CRUD-config engine and a declarative entity-relationship-hydration system. The client/error/util layering was adopted close to verbatim; the CRUD-config engine and relationship system were not — full reasoning below.

## Decision

**Adopt `wretch`** (pinned exact, `"3.0.9"`, no `^` — new dependency, no `bun audit` allowlist safety net, matches this project's stated pinning policy) as the transport layer, **hand-written**, not generated from the OpenAPI document. This resolves §9's open question: hand-write.

**Why hand-write over generation:** this project has 4 endpoints. A generator's payoff — not hand-typing request/response shapes — is real at ~80 resources and marginal at 4, where `packages/shared`'s existing Zod schemas already provide validated types with zero extra tooling. Evaluating an OpenAPI generator against a `@hono/zod-openapi` backend (§9's other unresolved half) is now moot; there's nothing to generate that Zod doesn't already give for free.

**Why `wretch` over continuing with raw `fetch`:** one configured client replaces the base-URL fallback, manual query-string building, and `!response.ok` check duplicated in both query modules, and centralizes error mapping into a typed `ApiError` that surfaces the API's real error message instead of a generic status-code string.

**Structure mirrors the reference project closely**, not just in spirit:

- `apps/web/src/lib/api/api-error.ts` — `ApiError extends Error` (`message`, `url`, `status` — the reference project's field order and `public readonly` style, adapted with `status`/`url` typed `| undefined` rather than the reference's `status = 0` default, since a genuine network failure has neither and this project's `exactOptionalPropertyTypes` convention treats "absent" and "a real falsy value" as distinct on purpose) and `isApiError()`.
- `apps/web/src/lib/api/api-client.ts` — an `ApiClass` singleton (`export const API = new ApiClass()`), `configure({ endpoint, headers? })` building one `wretch` instance with the `queryString` addon and a `catcherFallback` error mapper, plus a header-injection middleware wired in only when `config.headers` is supplied (unused today — no auth exists yet — but present so a future auth header has an established place to slot into). A standalone `getClient(request)` builds the per-request chain (path params, query params, headers, signal); `get<T>(request)` is the one verb this project needs (the API is read-only — no `post`/`put`/`patch`/`del`, no second `ingestClient`, unlike the reference).
- `apps/web/src/lib/api/types/requests.ts` — `Param`/`PathParams`/`QueryParams`, the reference's `types/requests.ts` almost verbatim, minus `null` from `Param` (this project uses `undefined` exclusively for "absent," never `null`).
- `apps/web/src/lib/api/utils/{error,params,path}.ts` (barrel-exported via `utils/index.ts`) — `getMessage`/`getStatus`/`getUrl`/`toApiErrorMessage` (error.ts), `cleanQueryParams` (params.ts), `buildPath` (path.ts, `:param` placeholder substitution — currently unused by any real route since none has a path param yet, kept for the same reason as the headers middleware: an established place, not speculative machinery beyond what the reference's own equivalent already costs).

**What was explicitly not ported from the reference project**, and why each is overkill at this scale:

- `DataType` enum + `DataTypeToEntity` mapped-type — exists so generic components/functions parameterized over dozens of entity shapes get full typing for free. With 3 entities (`Competition`, `Season`, `Player`), importing each type directly is simpler than building the indirection.
- The declarative `dataTypeActions` config table + generic `list`/`retrieve`/`create`/`update`/`del` engine (~1050 lines) — pays for itself once dozens of resources share 4-6 CRUD shapes. This project's 4 endpoints are cheaper to write as plain functions.
- The relationship-graph hydration engine (613 lines) — solves N+1 avoidance across a deeply cross-referential entity graph. `/players/compare`'s join is one backend query; there's no frontend-side relationship graph to hydrate.
- The bespoke `field:value$field2:value2` search-query DSL — invented to match that API's specific backend search syntax. Plain query params via TanStack Query already cover this project's filters.
- Runtime response validation was notably **absent** from the reference client (no Zod/io-ts anywhere in it, confirmed via repo-wide search) — a gap there, not a pattern to copy. This project keeps `safeParse` against `packages/shared`'s Zod schemas immediately after `get()` resolves, unchanged by this decision.

## Mechanism

The `queryString` addon (`wretch/addons/queryString`) replaces the manual `URLSearchParams` both query modules previously built by hand — `-queries/players.ts` now passes a plain `queryParams: { page, pageSize, search, position }` object, and `cleanQueryParams()` strips `undefined` entries before `.query()` serializes the rest.

Error mapping is one `catcherFallback` registered once in `configure()`:

- A non-2xx response throws wretch's own `WretchError` (`status`, `url`, `message` = response body text). `utils/error.ts`'s `toApiErrorMessage()` parses that body as JSON and extracts `error.message` from the API's real envelope when present, falling back to the raw text otherwise.
- A network failure (fetch itself rejecting) reaches the same `catcherFallback` with no `WretchError` wrapper — `getMessage`/`getStatus`/`getUrl` narrow it via `instanceof Error`/property checks rather than assuming a shape.
- Both paths throw one `ApiError` (message, url, status), via `isApiError()`.

Verified empirically against the **actually-installed** `wretch@3.0.9` (not the reference project's older pinned `2.9.0` — the two differ: 3.x wraps the error-body read more defensively and dropped `.errorType()` in favour of `.customError()`/direct `catcherFallback` parsing):

- `.options({ signal })` passes an existing `AbortSignal` (the one TanStack Query's `queryFn({ signal })` provides) straight through to the underlying `fetch` call.
- The real API error envelope round-trips through wretch's default error-body read and `toApiErrorMessage()` correctly extracts `error.message`.
- A thrown network error still reaches `catcherFallback`, with `status` absent.
- `Client`'s type (`QueryStringAddon & Wretch<QueryStringAddon>` in the reference project) needed its 4th generic param (`ErrorType`) pinned explicitly to `WretchError` here — the reference project doesn't run with `exactOptionalPropertyTypes` (this project does everywhere except `infra/`), and without pinning it, the type `.catcherFallback()` actually produces isn't assignable to a `Client` inferred with the default `ErrorType = undefined`.

## Consequences

- **Test mocks needed one small update, not a rewrite.** `wretch@3.0.9`'s error path calls `response.clone().text()` on a non-2xx response — a plain `{ ok, status, json }` mock (this project's existing pattern) needs `.clone()`/`.text()` added to reach a real message string. Only `-index-page.test.tsx`'s one message-content assertion needed this; `-index-route.test.tsx`/`-players-route.test.tsx`'s error tests only assert on the static `errorComponent` title/button, unaffected either way.
- **The error message text shown to users changed** from a generic `Request failed: ${status}` to the API's own message (e.g. "Internal Server Error"). No behavior regression — this is strictly more informative — but any future test asserting the old string needs updating (already done for the one that existed).
- **`apps/web` gained its first HTTP-client dependency** (previously zero — raw `fetch` only). Measured against the real build: entry chunk moved from 111.7 kB to 113.8 kB gzip (+2.1 kB, including the `queryString` addon) — negligible against the ~49 kB entry-chunk headroom noted in `docs/design/frontend-architecture.md` §6a.
- **Response validation is unchanged.** `wretch` does zero runtime validation; `safeParse` against `packages/shared`'s Zod schemas remains the trust-boundary check, immediately after `get()` resolves.
- **A configure-before-use requirement.** `API.configure()` must run once at app bootstrap (`main.tsx`) before any `get()` call, mirroring the reference's own `Call API.configure before attempting to make requests` guard. Tests share this requirement — `src/test/setup.ts` calls it once so route/component tests don't need their own boilerplate.

## Revisit if

- The API surface grows enough (many more resources, real CRUD beyond read-only `GET`s) that the generic-CRUD-engine pattern from the reference project starts looking proportionate rather than like premature machinery.
- An OpenAPI-generator specifically evaluated against `@hono/zod-openapi` turns out to produce a meaningfully better DX than hand-written `wretch` calls + existing Zod schemas — nothing here rules that out permanently, it just wasn't worth it at 4 endpoints.
