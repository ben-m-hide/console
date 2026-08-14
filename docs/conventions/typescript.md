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
    failed.push(toIngestionFailure(rawSeason, error));
  }
}
```

## Check for an existing util before writing one

Before writing logic that looks like it might already exist elsewhere in the repo, search for it first (`rg` for the shape, not just the name). If the same small piece of logic is about to appear a second time, extract it into a shared, tested util instead of duplicating it — don't wait for a third copy.
