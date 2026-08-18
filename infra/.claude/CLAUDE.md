# infra

AWS CDK (TypeScript) — S3 + CloudFront hosting stack for `apps/web`. See `docs/adr/0007-aws-s3-cloudfront-hosting.md`. Shares the root `package.json` (not a Bun workspace package) since CDK's own dependency shape doesn't fit the `apps/*`/`packages/*` convention.

Root `.claude/CLAUDE.md` rules (stack, coding standards, guardrails) apply here unmodified — this file only adds what's specific to this directory.

## Commands

```sh
bunx cdk synth      # from repo root — synthesize only
```

**Never `cdk bootstrap`/`cdk deploy`, no IAM/OIDC role creation** until an AWS account is confirmed and explicitly approved — see root `.claude/CLAUDE.md` Safety guardrails and `docs/adr/0007`.

## Notes

- CSP `connect-src 'self'` in `hosting-stack.ts` is a deliberate placeholder, not the API's real origin yet — update it once the API is deployed (see `docs/adr/0008`, `TODO.md`).
