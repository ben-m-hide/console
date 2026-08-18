# Disable `exactOptionalPropertyTypes` repo-wide

## Status

Accepted — built. `tsconfig.base.json`'s `exactOptionalPropertyTypes` is `false`; `infra/tsconfig.json`'s now-redundant override removed. Every consumer of the flag (docs, a skill, code comments) swept for accuracy, not just the tsconfig line.

## Context

The flag was adopted deliberately as part of "TypeScript 7, strictest config, everywhere except `infra/`" (ADR 0003's stack decision), and specifically checked — not assumed — against third-party library types on each new package (ADR 0007 for `infra/` against `aws-cdk-lib`, ADR 0008 for `apps/api` against Hono).

It caught real friction while building `apps/web/src/queries/`'s generic `list()`/`listQueryOptions()` factory (2026-08-18): forwarding an already-optional value (`pathParams?: PathParams`, destructured from one function's params) into another function's equally-optional parameter (`get({ path, pathParams, ... })`) is illegal under `exactOptionalPropertyTypes` — the object literal's `pathParams` key is always _present_, just sometimes holding `undefined`, and the flag treats "key present with `undefined`" as distinct from "key absent." Every layer in the chain (`list()` → `listQueryOptions()` → `get()`) hit this. Two fixes were tried: a conditional spread per field (`...(x !== undefined ? { x } : {})`) and widening every optional field's value type to `T | undefined`. Both worked, but the requirement to do it at every layer, for every field, on every function that forwards an optional param, was judged not worth what the flag catches — not against a specific incident, but as an ongoing-friction call the user made directly after seeing both workarounds in practice.

## Decision

Set `exactOptionalPropertyTypes: false` in `tsconfig.base.json`. `infra/tsconfig.json`'s override to `false` (previously needed because `aws-cdk-lib`'s own `.d.ts` didn't satisfy the flag — unrelated to this project's code) is now redundant with the base and removed.

**What stays, deliberately, despite the flag going away:** fields that are always-present keys with a genuinely nullable value — `apps/web/src/lib/api/api-error.ts`'s `ApiError.status: number | undefined` / `url: string | undefined` — keep their explicit `| undefined`. That distinction ("a network failure has no status" vs. "status was never checked") is real domain modeling, not a `exactOptionalPropertyTypes` artifact, and doesn't go away just because the flag does.

**What was reverted, since it existed only to satisfy the flag:** the `| undefined` widening added to `ApiRequest` (`lib/api/api-client.ts`) and `ListRequest<T>` (`queries/list.ts`)'s optional fields, back to plain `?:` — `?:` alone means "may be `T` or `undefined`" again once the flag is off. `queries/players/players.ts`'s comment justifying `.optional()` over a hand-written `search?: string` "because exactOptionalPropertyTypes" — trimmed; the schema itself didn't need to change, only the now-false justification in the comment.

## Consequences / known gaps, deliberately not resolved here

- Every doc that described `exactOptionalPropertyTypes` as project state (not history) was swept for accuracy: `.claude/CLAUDE.md`, `CONTRIBUTING.md`, `.claude/skills/new-workspace-package/SKILL.md`, `infra/.claude/CLAUDE.md`. ADRs 0007/0008/0016, which discuss the flag as a decision already made _at the time_, are left as historical record — each gets a short addendum pointing here instead of being rewritten, same pattern ADR 0011 used superseding part of ADR 0008.
- The category of bug this flag catches (code that silently treats "field omitted" and "field explicitly set to `undefined`" as the same thing when they shouldn't be) is no longer compiler-enforced. Nothing currently in the codebase is known to rely on that distinction outside the `ApiError` case above, which keeps its explicit typing regardless of the flag — but a future regression in that class won't be caught by `tsc` anymore.
- `packages/db`, `apps/api`, `apps/ingestion`, `packages/shared`, `packages/e2e` weren't individually re-audited for flag-motivated patterns beyond a repo-wide `grep` for `exactOptionalPropertyTypes` (which found only the `apps/web` sites addressed above) — if another package has undiscovered flag-shaped code, it'll surface as unnecessarily-defensive-looking code, not a build failure.
- **One suspected flag-motivated fix turned out not to be, caught by re-verifying rather than trusting the old attribution**: `apps/web/src/lib/api/api-client.ts`'s `Client` type pins its 4th generic param (`ErrorType`) to `WretchError` explicitly. ADR 0016 attributed this to `exactOptionalPropertyTypes`. Tested directly — removed the pin with the flag now off project-wide, `tsc` still fails with the same error. The real cause is a structural mismatch in `wretch@3.0.9`'s own generic inference for `.catcherFallback()`, unrelated to this project's tsconfig; the pin stays, ADR 0016 corrected in place rather than left wrong.

## Considered and rejected

- **Keep the flag, keep widening every forwarded optional field to `T | undefined`.** Works, but scales badly — every new function that forwards an optional param through another optional param needs the same treatment, and it was already happening three layers deep in one small feature.
- **Keep the flag, use the conditional-spread pattern (`...(x !== undefined ? { x } : {})`) everywhere instead of widening types.** Same scaling problem, and it's harder to read than the widened-type version — more syntax per call site instead of once per type.
- **Scope the flag off only for `apps/web/src/queries/` (or `apps/web` generally), matching `infra/`'s existing narrow-override precedent.** Rejected — `infra/`'s override exists because of a genuine third-party library gap (`aws-cdk-lib`'s own types), not a preference; scoping it off here would be preference-based, and the friction that triggered this wasn't `apps/web`-specific (any package forwarding optional params through several function layers would hit the same thing).
