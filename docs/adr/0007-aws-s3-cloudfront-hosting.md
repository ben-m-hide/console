# AWS S3 + CloudFront for hosting, over Cloudflare Pages/Vercel/Netlify

## Status

Accepted — infrastructure code written and `cdk synth` verified locally. **Not deployed.** No AWS account has been confirmed, no `cdk bootstrap` has run, and no CI deploy job exists yet — all deliberately out of scope until an account and explicit go-ahead exist.

## Context

The project ships as a static SPA (see ADR 0001) and needs somewhere to actually run. This was a genuinely open, unconstrained choice — no existing AWS account, no infra convention to slot into.

## Decision

**AWS: S3 (private, OAC-fronted) + CloudFront**, provisioned with **AWS CDK (TypeScript)**, over Cloudflare Pages / Vercel / Netlify.

Cloudflare Pages/Vercel/Netlify are legitimate, objectively simpler choices for a static SPA — they handle SPA fallback, TLS, and CDN caching close to zero-config. AWS was chosen anyway because:

- The undifferentiated setup those platforms hide (CDN cache invalidation, edge-level SPA fallback, a CSP/security-headers policy, cert/DNS wiring) is exactly the kind of thing worth understanding directly rather than delegating to a platform, given this project doubles as a place to build current AWS/IaC practice.
- AWS-specific experience is more broadly transferable to real-world infra than a Vercel/Cloudflare-specific setup would be.
- It forces doing IAM/OIDC properly for CI (no long-lived AWS keys in GitHub Actions) from day one rather than retrofitting it later.

**IaC: AWS CDK (TypeScript)**, over Terraform or a manual console-first setup. Reasoning: same language as the app (no context-switch to HCL), and CDK's `aws-cloudfront-origins` module has a purpose-built, current (OAC, not the legacy OAI) construct for exactly this S3+CloudFront pattern. Terraform is the more universally-transferable, cross-cloud skill, and was the closer runner-up — revisit if a second cloud or a Terraform-standardized team ever enters the picture.

## What was actually built (`infra/`)

- `infra/lib/hosting-stack.ts` — one `HostingStack`:
  - **S3 bucket**: private, `BlockPublicAccess.BLOCK_ALL`, `enforceSSL`, `RemovalPolicy.DESTROY` + `autoDeleteObjects: true`. Deliberate, not an oversight: this bucket holds nothing but the `dist/` build artifact, trivially reproducible from source — there's no data-loss risk destroying it, unlike a bucket backing a database or user uploads.
  - **CloudFront distribution**, origin via `S3BucketOrigin.withOriginAccessControl()` — confirmed against the installed `aws-cdk-lib@2.263.0` types that this (OAC) is the current recommended API; the older `S3Origin` (OAI-based) is explicitly flagged legacy in the library's own `.d.ts` comments.
  - **SPA fallback** via `errorResponses` on the distribution (403 and 404 → `/index.html`, HTTP 200), not a CloudFront Function. Simpler, and sufficient for a single-page app with no need to rewrite paths beyond "serve the app shell."
  - **`ResponseHeadersPolicy`** with a CSP, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, HSTS (2 years, includeSubDomains, preload), and `X-Content-Type-Options`.
- `infra/bin/console-next-infra.ts` — entry point, one stack, no environment/account specified yet (CDK's environment-agnostic synthesis).
- `infra/tsconfig.json`, referenced from the root `tsconfig.json` so `tsc -b --noEmit` actually covers it (otherwise this would repeat the exact decorative-declaration mistake `.nvmrc`/`engines.node` turned out to be — see README Known quirks).
- `cdk.json` — `app` runs the entry point directly via `bun infra/bin/console-next-infra.ts` (no separate compile/`ts-node`/`tsx` step; Bun executes TypeScript directly). The `context` feature-flag block is copied verbatim from a real `cdk init --language typescript` scaffold against the installed CDK version, not hand-written — an earlier draft of this file had one invented, non-existent flag (`@aws-cdk/core:newStyleStackSynthesis`) that a real `cdk init` run proved wrong.

## Consequences / known gaps, deliberately not resolved here

- **CSP needs `style-src 'unsafe-inline'`.** Verified empirically (rendered `IndexPage` under `MantineProvider` in a test and inspected the DOM) that Mantine injects runtime `<style data-mantine-styles>` tags for responsive breakpoints — this is real, not a hypothetical the README overstated. A strict CSP without `unsafe-inline` needs a per-request nonce via a CloudFront Function (viewer-request, stamping a nonce into both the response header and the injected `<style>` tag), which is real edge-compute work, deferred until it's worth the complexity.
- **`connect-src` is explicitly set to `'self'`, as a deliberate fail-safe placeholder, not the API's real origin.** This was a genuine gap for a while: this ADR (frontend/CSP) and ADR 0008 (backend) were written independently, and without an explicit `connect-src`, CSP's `default-src 'self'` governs `fetch`/XHR by fallback — meaning the moment the frontend actually calls the Hono API on any origin other than this CloudFront domain (the entire point of having a backend), every request would silently fail against the CSP, not against application logic. Caught by adversarial review, not by either ADR independently. Fixed by adding an explicit `connect-src 'self'` (currently equivalent to the old implicit behavior, but now a recorded, deliberate line rather than an invisible fallback) — **must be updated to the API's actual origin once the Lambda-vs-Fargate/custom-domain decision in ADR 0008 lands**, tracked in `TODO.md`.
- **No deploy pipeline yet.** No `aws s3 sync`/CI job exists. When one is written, it must explicitly exclude `*.map` from the sync (or upload-then-delete against an error tracker) — `build.sourcemap: "hidden"` still writes `.js.map` files into `dist/`, and this is the first point that gap becomes exploitable rather than theoretical (see README Known quirks).
- **No custom domain / ACM / Route53 yet** — ships to CloudFront's default `*.cloudfront.net` URL. Confirmed (not assumed) this is a non-breaking, in-place addition later: attach an ACM cert (must be `us-east-1`) and an alternate domain name to the _same_ distribution, no bucket/distribution recreation required.
- **`exactOptionalPropertyTypes` is off for `infra/` only**, not `src/`. `aws-cdk-lib`'s own type definitions (e.g. `Bucket` vs `IBucket`'s `isWebsite`) don't satisfy it — a real gap in the library's `.d.ts`, not something fixable from this side. Scoped narrowly rather than weakening the flag project-wide. **Superseded 2026-08-18 by ADR 0017**: the flag is now off project-wide for unrelated reasons, so `infra/`'s override is redundant and was removed — `infra/`'s specific `aws-cdk-lib` gap is moot now, not resolved.
- **`aws-cdk-lib`/`aws-cdk`/`constructs` are pinned exactly** (no `^`), same reasoning as the Biome pin in ADR-adjacent README notes: a large, security-sensitive dependency surface with no `bun audit` allowlist mechanism (see README Known quirks) shouldn't be left to float.
- **Putting `aws-cdk-lib` in the app's own `devDependencies` and infra in `infra/` inside this single package quietly pre-answers the still-open "does this become a monorepo?" question** — for now, no. This is the seam where a workspace split (app package + infra package, or app + backend + infra) would happen if/when a real backend project materializes. Noted here so it's a recorded tradeoff, not a silent default. **Resolved in ADR 0008**: the repo became a Bun workspace when the backend materialized, but as an asymmetric split — `packages/api` joined as a workspace, the frontend stayed the root package rather than moving into a matching `packages/console`. `infra/` itself did not move either.

## Considered and rejected

- **Cloudflare Pages** — simplest option, native SPA fallback and preview deploys, generous free tier. Rejected: less transferable to real-world AWS-based infra, and intentionally trades away the learning value of the underlying CDN/edge concepts.
- **Vercel** — excellent DX, but its zero-config model is most differentiated for Next.js-style frameworks; for a plain Vite SPA it's not meaningfully better than Cloudflare Pages, and carries the same AWS-transferability gap.
- **AWS Amplify Hosting** — a managed layer over S3/CloudFront that also handles SPA fallback and headers with less code. Rejected for the same reason raw S3+CloudFront was chosen over Cloudflare Pages: the point here is to learn the underlying primitives, not have AWS's own abstraction hide them too.
- **Terraform** — the stronger choice for cross-cloud/team-portable IaC skill, lost to CDK on same-language convenience for this specific, single-cloud, single-developer-context project. Revisit if either of those constraints changes.
