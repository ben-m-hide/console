# Render + Neon for backend hosting, deferring the AWS Lambda/Fargate migration

## Status

Accepted — decision only. No Render service, no Neon project, and no `apps/ingestion`-equivalent package exist yet; `packages/api` is still the ADR 0008 spike (`/health`, `/doc`, `/reference`).

## Context

A separate design exercise (`PROJECT.md`, not itself an ADR — an exploratory brainstorm, not a committed plan) proposed a concrete first domain for the backend (a football-analytics platform: ingestion job, Postgres schema, a real REST surface) and, alongside it, Render for API/ingestion hosting and Neon for Postgres. That collided with two standing decisions:

- ADR 0007 chose AWS for frontend hosting specifically to build transferable AWS/IaC experience, and rejected Cloudflare Pages/Vercel/Amplify for hiding exactly the primitives worth learning.
- ADR 0008 deferred the backend's deploy runtime (Lambda vs. Fargate/ECS) "once there's a confirmed AWS account and a real feature to deploy" — implicitly assuming AWS as the eventual target, not a third PaaS.

Reconciling this needed one more fact, not assumed: `TODO.md`'s Deployment section still has "Get/confirm an AWS account to deploy into" open, and the project's safety guardrails (`.claude/CLAUDE.md`) explicitly block `cdk bootstrap`/`cdk deploy`/IAM role creation until that account is confirmed and approved. That gate is unconditional — it blocks an AWS deploy target regardless of which compute choice is made today. Picking AWS now would not produce a running backend any sooner than picking Render; it would just mean building the CDK/IAM/networking work now instead of later, with nothing to show for it in the meantime.

## Decision

**Render** for the API and the scheduled ingestion job, **Neon** for Postgres, now — with the AWS Lambda/Fargate + EventBridge migration explicitly planned, not abandoned, for once an AWS account exists and is approved.

- **Neon isn't really part of the AWS-vs-not tension.** A Postgres connection string is location-agnostic — plenty of AWS-hosted stacks use Neon over RDS/Aurora deliberately, for branching and scale-to-zero without VPC/RDS-proxy ops overhead. ADR 0007's "learn the underlying primitives" reasoning was about frontend CDN/edge concepts, not about every managed data service having to be AWS's own.
- **Render is chosen for sequencing, not merit over AWS.** It sidesteps the AWS-account guardrail entirely and gets a real, deployed, end-to-end backend running now, which is what unblocks actually building the football-analytics domain (the concrete gap ADR 0008 flagged: "no first real feature/domain chosen yet"). AWS remains the intended long-term target for the reasons ADR 0007 already gave.
- **The planned migration is deliberately cheap**, not an afterthought: ADR 0008 chose Hono specifically because "the same code runs unchanged under Bun locally or Lambda's `hono/aws-lambda` adapter" — route/business logic doesn't change when the host changes. What does change, and is scoped here explicitly so it isn't a silent gap: Render's cron config → an EventBridge rule; the Dockerfile built for Render mostly carries over to Fargate as-is (Lambda specifically would need the `hono/aws-lambda` adapter path or a container-image Lambda); env vars/secrets move from Render's dashboard to Secrets Manager; and the frontend's CSP `connect-src` — already tracked as an explicit placeholder in ADR 0007/0008 pending _some_ real API origin — gets pointed at whichever origin is current at each stage.

## What was actually built

Nothing yet. This ADR records the decision ahead of the ingestion/API work so the choice is deliberate when `packages/ingestion` and the first real API routes land, not defaulted into.

## Consequences / known gaps, deliberately not resolved here

- `TODO.md`'s "Decide backend deploy runtime target: Lambda vs. Fargate/ECS — blocked on having an AWS account" is superseded in the near term: Render is the interim target; Lambda-vs-Fargate is now specifically the _post-migration_ AWS question, still blocked on the same account confirmation.
- No Render account or Neon project exists yet — creating them, and wiring `DATABASE_URL`/Render env vars, is new work, not yet done.
- The CSP `connect-src` placeholder (ADR 0007/0008) will need updating twice under this plan — once to Render's origin, again to whatever AWS origin replaces it — rather than once. Accepted as the cost of unblocking now.
- Render's own cron-job billing is not free past the API web service's free tier (a few dollars/month) — small, but a real recurring cost the AWS-only plan wouldn't have incurred yet.
- The ingestion job's workspace location is resolved as `apps/ingestion` (a deployable, not a shared library) by `docs/adr/0011-apps-and-packages-workspace-restructure.md` — scaffolding it is still whenever that package is actually created, not decided here.

## Considered and rejected

- **AWS Lambda/Fargate + EventBridge now** — not rejected on merit; rejected because the project's own guardrail blocks `cdk bootstrap`/`cdk deploy`/IAM role creation until an AWS account is confirmed and approved, which hasn't happened. Choosing this today would mean doing the CDK/IAM/networking work now with no deployable result until that gate clears anyway — strictly worse sequencing than Render for reaching a real running backend. Revisit the moment an account exists.
- **AWS RDS / Aurora Serverless v2 for Postgres** — viable, but a heavier ops surface (VPC networking, RDS Proxy for connection pooling under Lambda) for no benefit over Neon at this project's scale, and doesn't get easier by being "more AWS" if the compute side is on Render anyway.
- **Leaving the backend undeployed until the AWS account lands** — rejected: the project's explicit goal is genuine, current full-stack practice, and an API/ingestion job with nowhere to run blocks that; Render removes an artificial blocker with a bounded, already-scoped exit cost.
