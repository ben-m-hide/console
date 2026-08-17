# TypeScript Conventions

Applies to every `.ts`/`.tsx` file in this repo. Naming casing and array-type syntax (`Array<T>` over `T[]`, `useConsistentArrayType`) are already Biome-enforced (`biome.json`) — not repeated here; see `README.md` for which rules live where.

## Name inline object types

Don't inline an object-shaped type at the point of use — name it, even if it's only used once. A named type is greppable, reusable, and gives the shape a place to grow.

```ts
// Avoid
failed: Array<{ id: number; name: string; error: string }>;

// Prefer
interface IngestionFailure {
  id: number;
  name: string;
  error: string;
}
failed: Array<IngestionFailure>;
```

## Reference a field's type directly, not via indexed access on its parent

Once a field's type is already named (an interface property, a schema-derived type), reference that name directly at every other use site — don't reach for `ParentType["fieldName"]` as a shorthand. It reads as an extra indirection the reader has to resolve (look up `ParentType`, find `fieldName`, infer the actual type) for no benefit over just importing and using the field's own type name.

```ts
// Avoid
const failed: IngestSeasonsResult["failed"] = [];
const details: SportmonksPlayerStatisticRaw["details"] = [];

// Prefer
const failed: Array<IngestionFailure> = [];
const details: Array<SportmonksStatisticDetailRaw> = [];
```

Real example: this pattern (`XResult["failed"]`) had spread to every `ingest-<entity>.ts` orchestrator by the time it was caught — fixed everywhere at once, 2026-08-14, once flagged.

## Use explicit, human-readable names — no unexplained abbreviations

Biome's `useNamingConvention` only enforces casing and a two-character minimum — it can't judge whether a name is actually clear. Spell names out: `competition` not `cfg`, `request` not `req`, `temporary` not `tmp`, `index`/the actual loop variable's meaning not `idx`. This applies everywhere an identifier is introduced: variables, function/arrow parameters, loop variables, types, interfaces. A reader (human or Claude) should be able to tell what a value is without cross-referencing its declaration.

```ts
// Avoid
const cfg = loadConfig();
const idx = items.findIndex((i) => i.id === targetId);

// Prefer
const config = loadConfig();
const matchingIndex = items.findIndex((item) => item.id === targetId);
```

Common, unambiguous conventions are fine as-is and don't need spelling out: `i`/`j` in a bare numeric `for` loop, generic type parameters (`T`, `K`, `V`), well-known short forms already used consistently in this codebase (`db`, `id`), and a library's own documented idiomatic parameter name for its own callback (e.g. Hono's `c` for `Context` in `app.openapi(route, (c) => c.json(...))`, Playwright's `msg`/`err` for event-handler payloads) — these read as unclear in isolation but are immediately recognizable to anyone who knows the library, and renaming them fights the ecosystem's own convention rather than this project's.

## Name the return value before returning it

Don't inline-construct the return expression for anything beyond a trivial single value. A named variable gives the result a place to be inspected (in a debugger, in a log line) before it leaves the function, and reads top-to-bottom instead of requiring the reader to parse the return statement itself.

```ts
// Avoid
return { fetched: rawSeasons.length, upserted: rows.length, failed };

// Prefer
const result: IngestSeasonsResult = {
  fetched: rawSeasons.length,
  upserted: rows.length,
  failed,
};
return result;
```

Exempt: `return Schema.parse({ ... })`. The object literal there is validation _input_, not the returned value — the actual return value is whatever `.parse()` produces, which naming the input literal wouldn't make any more inspectable. Wrapping the call itself (`const result = Schema.parse(...); return result;`) is fine if you want to inspect the validated output, but not required.

## Array methods for pure transforms; loops stay fine for side effects

Prefer `.map`/`.filter`/`.reduce` when a loop is a pure list-to-list transform. A `for`/`for...of` loop is still the right tool when the body has side effects, needs an early exit, or does per-item error isolation (accumulating into more than one output, e.g. successes vs. failures) — forcing that into `.reduce()` is usually less readable, not more.

```ts
// Prefer array methods — pure transform
const names = competitions.map((competition) => competition.name);

// Loop is fine — side effect + per-item error isolation, doesn't fit a pure transform
for (const rawSeason of rawSeasons) {
  try {
    rows.push(normalizeSeason(rawSeason, competitionIdByLeagueId));
  } catch (error) {
    failed.push({
      id: rawSeason.id,
      name: rawSeason.name,
      error: toErrorMessage(error),
    });
  }
}
```

## Where types live

Same promotion rule as code (see root `CLAUDE.md`'s "Promote code to `src/lib`/`src/hooks` only once a second consumer actually needs it") — apply it to types too, not a separate rule:

1. **Inline, in the file that uses it** — the default. A single-consumer type stays where it's used. It still has to be named per "Name inline object types" above — inline here means "not extracted to its own file," not "unnamed."
2. **Co-located file within the app, once a second consumer needs it** — extract on the second use, same trigger as any other util. Name the file after what it contains: a concept (`ingest-result.ts` — the shared result shape) or a category (`sportmonks-types.ts` — a pile of raw external API shapes with nothing else in common). Don't force a `-types.ts` suffix onto a file that already has a concept name; use it when the file's only job is holding types with no shared concept of their own.
3. **`packages/shared`, once a second app needs it** — but only for types derived from the Drizzle schema (`packages/db`) via the generated Zod schemas (see ADR 0013). A cross-app type with no DB backing doesn't have a home yet — that's a real gap, not silently covered by `packages/shared`; revisit when it actually happens instead of guessing now.

```ts
// Tier 1 — inline, single consumer (normalize-season.ts)
export type InsertableSeason = ReturnType<typeof InsertableSeasonSchema.parse>;

// Tier 2 — co-located, two consumers within apps/ingestion (ingest-result.ts)
export interface IngestionFailure {
  id: number;
  name: string;
  error: string;
}

// Tier 3 — packages/shared, two apps, DB-schema-derived (schemas/competition.gen.ts)
export type Competition = z.infer<typeof CompetitionSchema>;
```

## Test fixtures don't live in a types file

Real captured sample data used only by tests (`SAMPLE_*`-style constants) is not a type — it doesn't belong in a `-types.ts`/`sportmonks-types.ts`-style file even if that file's types are what the sample data is shaped as. Give it its own file (`sportmonks-fixtures.ts`, sibling to `sportmonks-types.ts`), importing the types it needs from the types file. Same "where types live" promotion logic applies to _where fixtures live_: inline in the one test that needs it by default, extracted to a shared fixtures file once a second test file needs the same sample.

Real example: `sportmonks-types.ts` originally held both the raw Sportmonks type definitions and every `SAMPLE_*` real-captured-response constant used by `normalize-*.test.ts` files. Split apart 2026-08-14 — types stayed, fixtures moved to `sportmonks-fixtures.ts`. A file whose header comment says "raw API response shapes" describing types should not also be where test data lives; a reader looking for "what does the wire format look like" shouldn't have to scroll past 150 lines of test fixtures to find it, and vice versa.

## Check for an existing util before writing one

Before writing logic that looks like it might already exist elsewhere in the repo, search for it first (`rg` for the shape, not just the name). If the same small piece of logic is about to appear a second time, extract it into a shared, tested util instead of duplicating it — don't wait for a third copy.

Real example: `error instanceof Error ? error.message : String(error)` appeared verbatim in both `ingest-competitions.ts` and `ingest-seasons.ts`'s catch blocks — extracted into `apps/ingestion/src/to-error-message.ts`'s `toErrorMessage()`, with its own test file, on the second occurrence.

## `void`-prefix a promise only when it's bound to a synchronous callback type

Prefer `await` in an `async` function over `void`-prefixing a fire-and-forget promise — it keeps a place for a future `.catch` and reads as "not blocking on this" rather than "ignored." But when the function is passed directly as a prop typed to return `void` synchronously (Mantine's `onChange`/`onClick`, and other DOM/UI-library event handlers), making it `async` trips `nursery.noMisusedPromises` ("this function returns a Promise, but no return value was expected") — verified empirically against Biome 2.5.7, which exposes no option to relax this check. `void` is the only one of `noFloatingPromises`'s five accepted forms that also satisfies `noMisusedPromises` in that position, so it stays.

```ts
// Not bound to a callback type — prefer async/await
useEffect(() => {
  const timeoutId = setTimeout(async () => {
    await navigate({
      search: (previous) => ({ ...previous, search: nextSearch, page: 1 }),
    });
  }, SEARCH_DEBOUNCE_MS);
  return (): void => clearTimeout(timeoutId);
}, [navigate]);

// Bound to a synchronous callback prop (Mantine's onChange: (page: number) => void) —
// making this async would fail noMisusedPromises, so void stays
const handlePageChange = useCallback(
  (page: number): void => {
    void navigate({ search: (previous) => ({ ...previous, page }) });
  },
  [navigate],
);
```
