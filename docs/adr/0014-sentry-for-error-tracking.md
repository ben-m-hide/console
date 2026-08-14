# Sentry (hosted free tier) for error tracking, over GlitchTip or self-hosting

## Status

Accepted — decision only. No Sentry account, no DSN, no SDK wired into `apps/web` or `apps/api` yet. Blocked on a real Sentry account + DSN before implementation can start and be verified — same pattern as Neon/Render (ADR 0010): a placeholder DSN can't be verified against a real captured error, only a real one can.

## Context

`TODO.md`'s Observability section has had "Error tracking (e.g. Sentry) — zero production observability right now" open since the project's early scaffolding, alongside a related item tying sourcemap strip/upload strategy to whichever tracker is picked. Before wiring anything in, the brief was to research free alternatives to Sentry rather than default to it, since this project's constraint is "no real users" (`.claude/CLAUDE.md`) — a paid tier, or the ops overhead of self-hosting something, both need justifying against that scale, not assumed.

Researched directly (not from training-data memory, all fetched and verified in-session):

- **Sentry's free "Developer" plan** (sentry.io/pricing/, fetched 2026-08-14): $0, one user, error monitoring and tracing, alerts via email, 10 custom dashboards, MCP access. The exact numeric event quota wasn't visible in the static page fetch (client-rendered pricing widget), but multiple 2026 secondary sources converge on ~5,000 errors/month — not independently confirmed to the exact number, flagged as [UNVERIFIED] on that specific figure, though the plan's existence and feature list above are directly confirmed.
- **GlitchTip** (glitchtip.com/pricing, glitchtip.com, fetched 2026-08-14): an open-source, Sentry-SDK-compatible error tracker. Hosted free tier: up to 1,000 events/month, unlimited projects, unlimited team members. Self-hosted: free and open source — no vendor-imposed event cap since it's your own infrastructure, though this specific page's self-hosted tier text wasn't captured distinctly from the hosted pricing table in the fetch (the two tabs' content merged in the static scrape); the "self-hosted has no vendor quota" claim rests on it being your own deployment rather than a directly quoted limit. Self-hosting needs 4 containers (Django web app, Celery worker, PostgreSQL, Redis) per third-party summaries of GlitchTip's own architecture docs, not independently verified this session.
- **Official first-party SDK support for this exact stack**, confirmed by fetching Sentry's own docs (docs.sentry.io/platforms/javascript/guides/bun/, .../guides/hono/): dedicated Bun and Hono guides exist, alongside the well-established React SDK. GlitchTip's own SDK is literally the `@sentry/*` packages pointed at a different DSN — no separate SDK to learn or maintain.

## Decision

**Sentry's hosted free Developer tier**, for both `apps/web` (React) and `apps/api` (Hono/Bun), once a real account exists.

- **Self-hosting (GlitchTip or otherwise) is rejected on Simplicity-first grounds**, not researched depth: this project has zero real users, so error volume will sit nowhere near any free tier's cap — the entire reason to self-host (avoid hitting a paid tier at real scale) doesn't apply. Self-hosting would instead be net-negative: a 4-container service (Django/Celery/Postgres/Redis) is itself a new production dependency needing its own hosting, monitoring, and upgrades — more operational surface than the error tracker it exists to reduce, for a project explicitly not optimizing for "run infrastructure for its own sake."
- **Sentry over a hosted GlitchTip free tier**: both are viable at this project's scale (1,000/mo GlitchTip vs. an effectively-never-hit Sentry quota, given no real users), so the tiebreaker is the project's own stated goal — "genuine, transferable, current industry-standard practice" (`.claude/CLAUDE.md`). Sentry is the tool the wider industry actually standardizes on; learning its dashboard, alerting, and SDK conventions is more transferable than GlitchTip's. GlitchTip's SDK-compatibility is the real reason this choice is cheap, not risky: switching later — to GlitchTip hosted, or to self-hosting — is a DSN change, not a rewrite, since both speak the same `@sentry/*` SDK protocol.
- **Free tier is the right sizing now**, not a placeholder to revisit soon: at true zero real-user traffic, Sentry's free quota (whatever the exact number) isn't a meaningful constraint. Revisit only if this project ever gets real external users — an explicit non-goal today.

## What was actually built

Nothing yet. This ADR records the decision so SDK wiring, when it happens, isn't defaulted into without the free-vs-self-hosted trade-off having been made deliberately.

## Consequences / known gaps, deliberately not resolved here

- **Needs a real Sentry account + DSN before any implementation** — same blocking pattern as Neon/Render (ADR 0010): a fake/placeholder DSN can't be verified against a real captured error, so nothing gets wired until the account exists. Tracked in `TODO.md`.
- **Sourcemap strip/upload strategy remains a separate, still-open `TODO.md` item**, deliberately not resolved here — it's coupled to whichever deploy pipeline (Render for `apps/api`, S3/CloudFront for `apps/web`) actually ships first, neither of which exists yet. SDK wiring for basic error capture doesn't need to wait for that; production-quality readable stack traces do.
- **The exact free-tier event quota wasn't independently confirmed to the number** — the pricing page's numeric quota is behind client-side rendering this session's static fetch didn't capture. Not load-bearing for the decision (traffic is nowhere near any plausible free-tier number), but worth a real check at signup time rather than trusting the unverified figure carried in this ADR.
- **`apps/api` runs on Bun today, deploying to Render** (ADR 0010) **with an eventual AWS Lambda/Fargate migration planned** — Sentry's Bun SDK guide was confirmed to exist, but Lambda-specific Sentry wiring (`@sentry/aws-serverless` or similar) wasn't researched here since that migration itself is still gated on an AWS account (ADR 0010). Revisit SDK specifics at that migration, not now.

## Considered and rejected

- **Self-hosted GlitchTip** — rejected: adds a 4-container production service (Django/Celery/Postgres/Redis) to maintain for a project with no real users to justify the avoided vendor cost. The entire benefit (no event cap) is moot when real usage will never approach either vendor's free-tier cap anyway.
- **GlitchTip hosted free tier** — not rejected on capability (it's fully SDK-compatible and would work), but loses the tiebreak to Sentry on this project's explicit "transferable, current industry-standard practice" goal. Kept as the documented cheap fallback if Sentry's free tier is ever outgrown, precisely because switching is a DSN change under the same SDK.
- **PostHog** (surfaced during research as having a notably larger free error-event allowance) — not pursued: it's primarily a product-analytics tool with error tracking as one feature, a different tool shape than this project needs right now (a dedicated error tracker, not analytics instrumentation). Worth a look only if product analytics itself becomes a real need later, which is out of scope for the observability gap this decision closes.
- **Doing nothing / deferring until a deploy pipeline exists** — rejected: local-verifiable SDK wiring and error capture don't require a deployed target (the sourcemap/production-readability half does, and that half is explicitly deferred above, not skipped). No reason to block the whole item on deploy-pipeline work that's separately gated elsewhere.
