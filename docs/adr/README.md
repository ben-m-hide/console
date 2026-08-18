# Architecture Decision Records

One record per significant, hard-to-reverse, non-obvious decision — not every decision made on this project. See each file for full context and rejected alternatives.

| #                                                             | Title                                                                                 | Status                                                         |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| [0001](./0001-vite-spa-tanstack-router-over-metaframework.md) | Client-rendered SPA with TanStack Router, not a meta-framework                        | Accepted                                                       |
| [0002](./0002-bun-as-package-manager.md)                      | Bun as package manager                                                                | Accepted                                                       |
| [0003](./0003-typescript-7.md)                                | TypeScript 7 (native compiler)                                                        | Accepted                                                       |
| [0004](./0004-biome-for-lint-and-format.md)                   | Biome for linting, formatting, and import ordering                                    | Accepted                                                       |
| [0005](./0005-app-foundation-libraries.md)                    | App foundation libraries: Zustand, TanStack Query, TanStack Form, Zod                 | Accepted                                                       |
| [0006](./0006-mantine-over-tailwind-shadcn.md)                | Mantine over Tailwind + shadcn/ui + Base UI                                           | Accepted (supersedes the original Tailwind + shadcn/ui choice) |
| [0007](./0007-aws-s3-cloudfront-hosting.md)                   | AWS S3 + CloudFront for hosting, over Cloudflare Pages/Vercel/Netlify                 | Accepted — not deployed                                        |
| [0008](./0008-hono-rest-openapi-backend.md)                   | Hono + REST/OpenAPI backend, as a Bun workspace alongside the frontend                | Accepted — spike only, no real feature yet                     |
| [0009](./0009-e2e-as-own-workspace-package.md)                | E2E tests as their own workspace package, not inside the frontend                     | Accepted — one smoke test only                                 |
| [0010](./0010-render-and-neon-for-backend-hosting.md)         | Render + Neon for backend hosting, deferring the AWS migration                        | Accepted — decision only, nothing built yet                    |
| [0011](./0011-apps-and-packages-workspace-restructure.md)     | `apps/*` + `packages/*` workspace restructure, supersedes ADR 0008                    | Accepted — executed in full                                    |
| [0012](./0012-packages-db-and-bun-sql-driver.md)              | `packages/db` as its own package, `drizzle-orm/bun-sql` over Neon's serverless driver | Accepted — schema + migration built, not yet wired up or run   |
| [0013](./0013-generate-shared-schemas-from-drizzle.md)        | Generate `packages/shared`'s Zod schemas from `packages/db`'s Drizzle tables          | Accepted — built                                               |
| [0014](./0014-sentry-for-error-tracking.md)                   | Sentry (hosted free tier) for error tracking, over GlitchTip or self-hosting          | Accepted — decision only, no DSN/SDK yet                       |
| [0015](./0015-visx-for-charting.md)                           | visx for charting and data visualisation, over Mantine Charts/Recharts                | Accepted — decision only, nothing built                        |
| [0016](./0016-wretch-for-api-client.md)                       | wretch for the API-client transport layer, hand-written not generated                 | Accepted — built                                               |
| [0017](./0017-disable-exactoptionalpropertytypes.md)          | Disable `exactOptionalPropertyTypes` repo-wide                                        | Accepted — built                                               |
| [0018](./0018-disable-erasablesyntaxonly.md)                  | Disable `erasableSyntaxOnly`, allow TS `enum`                                         | Accepted — built                                               |

## Adding one

Only write an ADR when all three are true: the decision is hard to reverse, it would be surprising without context, and it was a genuine trade-off between real alternatives. Number sequentially, add a row above.
