# React Conventions

Applies to every `.tsx` file in this repo. Component-authoring rules specific to React — general TypeScript rules (naming, inline types, named returns) live in [`typescript.md`](./typescript.md) and apply here too.

Rules Biome already enforces aren't repeated here. Relevant one to know about: **`performance/noJsxPropsBind` is set to `error`**, so passing a freshly-created function as a JSX prop already fails the lint — that machine-enforces part of the memoization convention below.

## Use `<Fragment>`, not the `<>` shorthand

Spell the component name. `<Fragment>` is greppable, matches the explicit-naming rule in [`typescript.md`](./typescript.md), and — the practical argument — **a keyed fragment cannot use the shorthand at all**, since `<>` accepts no props. Any list rendering multiple siblings per item already has to write `<Fragment key={…}>`, so preferring it everywhere makes the codebase uniform instead of switching syntax based on whether a key happens to be needed.

```tsx
// Avoid
return <>{children}</>;

// Prefer
return <Fragment>{children}</Fragment>;
```

> **Do not enable Biome's `style/useFragmentSyntax`.** That rule enforces the _opposite_ — shorthand over `<Fragment>` — and would fight this convention. It is currently off, which is why this is a doc entry rather than a lint rule: Biome has no rule for this direction.

## Memoize by default — `useMemo` and `useCallback` over inline values and functions

Hoist values and functions out of the render body into `useMemo`/`useCallback` rather than recreating them inline on every render. Apply this by default rather than case by case.

This is a deliberate team choice, and React's own documentation explicitly allows for it:

> "There is no significant harm to doing that either, so some teams choose to not think about individual cases, and memoize as much as possible."
> — [React docs, "Should you add useMemo everywhere?"](https://react.dev/reference/react/useMemo)

The reason to adopt it as a blanket rule rather than a judgement call is consistency: deciding per-value costs more attention than it saves, and a missed memoization in a hot path is harder to spot later than an unnecessary one.

```tsx
// Avoid — new array and new function on every render
const visible = competitions.filter((competition) => competition.isActive);
return <List items={visible} onSelect={(id) => select(id)} />;

// Prefer
const visible = useMemo(
  () => competitions.filter((competition) => competition.isActive),
  [competitions],
);
const handleSelect = useCallback((id: number): void => select(id), [select]);
return <List items={visible} onSelect={handleSelect} />;
```

### Where it does not apply

- **Trivial primitives.** `useMemo` has its own cost — a dependency array to allocate and compare. Wrapping `const total = a + b` is net-negative. Memoize objects, arrays, and functions (where identity matters to a child or a hook dependency) and genuinely non-trivial computation; not scalar arithmetic or a string concat.
- **Values with an unstable dependency.** React's own caveat: _"a single value that's 'always new' is enough to break memoization for an entire component."_ A `useMemo` whose dependency changes every render is pure overhead with a misleading appearance of optimisation. Fix the unstable dependency first.
- **Correctness.** Memoization is a performance tool only. If code only works _because_ something is memoized, the underlying problem is elsewhere — find it rather than depending on cache identity.

### If React Compiler is ever adopted

This convention would become largely redundant. React's guidance for new code is to let the compiler handle memoization, using the hooks only for precise control. This project does **not** use React Compiler today — there is no compiler plugin in `apps/web/vite.config.ts`, verified 2026-08-16 — which is why the manual convention stands.

If it is adopted later, note React's warning that removing existing memoization changes compilation output, so this should be revisited deliberately as a migration rather than by bulk-deleting hooks.

## Type function components with `FC`

Every function component gets an explicit `FC` type on its declaration: `FC<Props>` when it takes props, bare `FC` when it does not, `FC<PropsWithChildren>` (or `FC<PropsWithChildren<Props>>` alongside its own props) when it takes `children`. This is a deliberate against-the-grain choice — React's own TypeScript cheatsheet dropped the recommendation to use `FC` for newly-written components, mainly because it used to implicitly add a `children` prop even to components that didn't accept one. That implicit-`children` behavior was removed in the `@types/react` 18 typings, which is what makes adopting `FC` here safe: a bare `FC` no longer silently accepts `children`, so the original objection doesn't apply to the version this project is on. Verified empirically no conflict with `useExplicitReturnType`, `useNamingConvention`, `noNestedComponentDefinitions`, or `noReactPropAssignments` — a colon-typed variable declaration (`const Foo: FC<Props> = (props) => {...}`) already satisfies all of them, expression-body or block-body.

```tsx
// No props
export const CompetitionsPending: FC = () => (
  <Stack p="xl">
    <Loader aria-label="Loading competitions" />
  </Stack>
);

// Props, no children
export const CompetitionsError: FC<ErrorComponentProps> = ({ error }) => {
  return <Alert color="red">{error.message}</Alert>;
};

// Children, no other props
export const TestErrorBoundaryWrapper: FC<PropsWithChildren> = ({
  children,
}) => <Fragment>{children}</Fragment>;

// Children plus own props
interface TestProvidersProps extends PropsWithChildren {
  queryClient: QueryClient;
}
export const TestProviders: FC<TestProvidersProps> = ({
  children,
  queryClient,
}) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);
```

Class components (e.g. an error boundary that needs `getDerivedStateFromError`) are unaffected — this only applies to function components.
