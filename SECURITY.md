# Security

This is a private, personal learning project (see [`LICENSE`](./LICENSE)) — not a public product with a security team or a bug bounty. There's no formal disclosure program here, but if you find a real vulnerability:

- Email ben.m.hide@gmail.com with details and, if possible, steps to reproduce.
- Don't open a public GitHub issue for anything that could be actively exploited before it's fixed.

## What's already in place

- `bun audit --audit-level=high` runs in CI on every push/PR against the full dependency tree (see README's Known quirks for the one real gap: no allowlist for an advisory with no available fix yet).
- Dependabot (`.github/dependabot.yml`) opens weekly PRs for both `bun` dependencies and GitHub Actions versions.
- The AWS hosting stack (`infra/`, see `docs/adr/0007-aws-s3-cloudfront-hosting.md`) uses a private S3 bucket with Origin Access Control (not public), enforced HTTPS, and a CSP/security-headers policy — though the CSP currently needs `style-src 'unsafe-inline'` for Mantine's runtime styles, a documented, not accidental, gap.
- No secrets are committed; `.env*` files are gitignored (an `.env.example` exception is already carved out in `.gitignore` for whenever real config lands — there are no env vars yet, so none exists today).
