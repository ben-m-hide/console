# Generic `list()` fetch + `listQueryOptions()` factory

## Context

`apps/web`'s two query modules (`-queries/players.ts`, `-queries/competitions.ts`) each hand-rolled an identical `get()` → `schema.safeParse()` → throw-on-failure shape, down to an identical error string (`"Response did not match the expected schema"`). Also finishing off the in-progress `src/queries/` relocation (already scaffolded, untracked) and the loading/error-state consolidation (`GenericError`/`GenericPending`, done this session, closes the matching `TODO.md` item).

**Prior art checked, not silently overridden:** ADR 0016 explicitly rejected a generic entity/CRUD engine at this project's scale (2 list endpoints), calling it premature — "revisit if the API surface grows." This is narrower (just `list`, not full CRUD) and the duplication is real and identical, so it clears that bar without contradicting the ADR's reasoning.

**Response-shape asymmetry that shapes the design:** `/api/v1/competitions` returns a bare `Array<Competition>`; `/api/v1/players` returns `{ data, meta }`. `list()` stays shape-agnostic — the caller's Zod schema defines the shape, same as today. No `select` baked into the factory (an earlier sketch had `select: r => r.data`, dropped — doesn't generalize, competitions has no `.data`).

## Files touched

- New `apps/web/src/queries/list.ts` — generic `list<T>()`.
- New `apps/web/src/queries/list-query-options.ts` — generic `listQueryOptions<T>()`, built on `list()`. Split into its own file per user direction (2026-08-18) rather than one combined file.
- `apps/web/src/queries/players/players.ts`, `apps/web/src/queries/competitions/competitions.ts` (already scaffolded as untracked duplicates) — rewritten to call `listQueryOptions()` instead of hand-rolling fetch+parse.
- Delete `apps/web/src/routes/-queries/` (both files) once the new location is wired in.
- `apps/web/src/routes/index.tsx`, `apps/web/src/routes/players/index.tsx` — import path update (`./-queries/*` → `@/queries/*/*.ts`).
- `biome.json` — move the `nursery.useExplicitReturnType: off` override (needed because `queryOptions()`'s `skipToken` sentinel overload can't be reproduced by hand) from `apps/web/src/routes/-queries/**` to `apps/web/src/queries/**`.
- `docs/design/frontend-architecture.md` — update stale `routes/-queries/` references (directory table, decision matrix, adopted-pattern prose) to the new path; also stale from the earlier `src/components/pages/` move, folded in here.
- `TODO.md` — mark the "generic state components" item done (loading/error consolidation, done this session). The separate "`DataType` enum ↔ entity-interface mapping" item stays open/untouched — this task doesn't resolve it, it's a narrower fetch+options helper, not an entity-type-mapping layer.

## Approach

```ts
// src/queries/list.ts
interface ListRequest<T> {
  path: string;
  pathParams?: PathParams;
  queryParams?: QueryParams;
  schema: z.ZodType<T>;
  signal?: AbortSignal;
}
export const list = async <T>({
  path,
  pathParams,
  queryParams,
  schema,
  signal,
}: ListRequest<T>): Promise<T> => {
  const body = await get({ path, pathParams, queryParams, signal });
  const parsed = schema.safeParse(body);
  if (!parsed.success)
    throw new Error("Response did not match the expected schema");
  return parsed.data;
};
```

```ts
// src/queries/list-query-options.ts
interface ListQueryOptionsRequest<T> extends Omit<ListRequest<T>, "signal"> {
  queryKey: QueryKey;
}
export const listQueryOptions = <T>({
  queryKey,
  ...request
}: ListQueryOptionsRequest<T>) =>
  queryOptions({
    queryKey,
    queryFn: ({ signal }) => list({ ...request, signal }),
  });
```

`queryKey` stays caller-supplied (not derived from `path`) to preserve the existing hierarchical-key convention (`["players", "list", params]`, documented in-code as enabling future sibling invalidation) — a derived key would either lose that or need its own mini-DSL, which is the kind of premature machinery ADR 0016 already warned about.

**Alternative considered:** deriving `queryKey` automatically from `path` + params. Rejected — not proportionate to 2 entities, same reasoning as ADR 0016.

## Test/type impact

No behavior change for either screen — `list()` is a pure refactor of existing logic, same schemas, same error string. Existing route/component tests (`CompetitionsList.test.tsx`, `players/-index.test.tsx`) should pass unmodified. `PlayerListMeta`/`PlayerPosition`/`PlayersSearchSchema` etc. stay in `queries/players/players.ts` — only the fetch/parse boilerplate moves out.

## Migration/breaking-change risk

None — internal refactor, no API/contract change, no schema change.

## Rollback

Trivial — new files, one deleted directory, a handful of import-path edits. `git revert` or restore `-queries/` from `main` if it doesn't pan out.
