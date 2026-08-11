# Client-rendered SPA with TanStack Router, not a meta-framework

console-next has no SSR/SEO requirement today (it's an authenticated console, not a crawled public site), so we chose a plain Vite + React SPA over Next.js or TanStack Start. TanStack Start was also ruled out on its own merits: as of 2026-08-07 it's still officially "Release Candidate" (never formally GA'd), has an open correctness bug where its SSR router singleton leaks request-scoped state across requests, and its `@tanstack/start-*` packages were hit by a supply-chain incident in May 2026. We still adopted TanStack Router directly inside the SPA (rather than plain `react-router`) because Start is built on top of it — if an SSR/SEO need materializes later, migrating from Router to Start is incremental rather than a rewrite.

## Considered Options

- **Next.js (App Router)** — rejected: brings RSC/server-runtime complexity with no SSR requirement to justify it.
- **TanStack Start** — rejected: pre-GA status, the router-singleton leak, and the May 2026 supply-chain incident on its packages.
- **Vite + React Router (library mode)** — rejected in favor of TanStack Router specifically for its type-safe routing and the low-cost upgrade path to Start.
