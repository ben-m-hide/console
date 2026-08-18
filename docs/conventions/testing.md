# Testing Conventions

Applies to Testing Library-based tests (`*.test.tsx`) in this repo.

## Destructure queries from `render()`, don't use `screen`

```tsx
// Avoid
render(<CompetitionsList />);
expect(screen.getByText("Premier League")).toBeInTheDocument();

// Prefer
const { getByText } = render(<CompetitionsList />);
expect(getByText("Premier League")).toBeInTheDocument();
```

## Prefer an exact string over a regex when an exact match works

A regex earns its place only when the match is genuinely partial or the exact text isn't known up front (dynamic content, whitespace uncertainty). Match a known, exact string as a plain string literal.

```tsx
// Avoid
expect(getByText(/Premier League/)).toBeInTheDocument();

// Prefer
expect(getByText("Premier League")).toBeInTheDocument();
```

When the target text is genuinely only part of a node's full text content (e.g. `CompetitionsList.tsx` renders `{competition.name} — {competition.country}` as one node, `"Premier League — England"`), use RTL's own `{ exact: false }` option rather than reaching for a regex — same plain-string matcher, substring semantics made explicit instead of implicit in a pattern.

```tsx
// Avoid — regex to work around a partial match
expect(getByText(/Premier League/)).toBeInTheDocument();

// Prefer
expect(getByText("Premier League", { exact: false })).toBeInTheDocument();
```
