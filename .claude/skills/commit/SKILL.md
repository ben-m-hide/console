---
name: commit
description: Create a git commit (and its branch/push/PR handoff) in console-next following this project's exact conventions — Conventional Commits format, branch naming, no Claude co-author trailer, branch-only PR workflow. Use whenever committing, opening a new branch for a change, or fixing an inconsistent commit message in this repo.
---

These conventions aren't enforced by any config file alone (some are; some can't be) — this skill is the single place they're all written down, so any session or contributor gets the same result, not just whoever remembers.

## Steps

1. Confirm the full pipeline already passed (lint/typecheck/test/build/`bun audit`) per root `.claude/CLAUDE.md`'s Operational rules — don't commit before it does.
2. If not already on a feature branch, create one: `<type>/<kebab-slug>`, where `<type>` matches the commit's own Conventional Commits type below — e.g. `fix/squad-memberships-unique-constraint`, `docs/release-please-parsing-bug`, `ci/dependency-review`. **Never commit directly to `main`** — every change here lands via branch + PR, even solo (confirmed by branch protection on `main`, not just convention).
3. Review `git status`, then stage only the files the change actually touches (`git add <files>` — not `git add -A`/`.`).
4. Write the commit message (see Conventional Commits format below).
5. Commit, then `git push -u origin <branch>` and hand over the compare URL: `https://github.com/ben-m-hide/console/compare/main...<branch>`. **Never merge, and don't try `gh pr create`/`gh pr merge`** — `gh` here is authenticated as an account with no access to this repo (work laptop, personal repo); those calls fail. The user merges via the browser, logged in as the repo owner.

## Conventional Commits format

Enforced by `commitlint.config.js` (`@commitlint/config-conventional`) via a `commit-msg` hook — a malformed message is rejected outright, but two of its rules are easy to trip anyway:

```
<type>(<scope>): <subject>

<body>

<footer>
```

- `type` — one of `build`/`chore`/`ci`/`docs`/`feat`/`fix`/`perf`/`refactor`/`revert`/`style`/`test`, lowercase.
- `scope` — optional, lowercase, usually the package/dir touched (`db`, `web`, `shared`).
- `subject` — lowercase, no trailing period, header line ≤100 chars total.
- **A blank line must separate the subject from the body, and separate the body from any footer** (`body-leading-blank`/`footer-leading-blank`) — a multi-paragraph body is fine with no blank lines _between_ its own paragraphs, but a genuine footer-shaped closing line (a `BREAKING CHANGE:` note, an issue reference) needs a blank line directly before it. This is the rule this project's own commits have tripped on more than once — commitlint only warns on it, doesn't reject, so it's easy to miss.
- **Never add a `Co-Authored-By: Claude` (or any Claude/Anthropic) trailer** — this overrides the harness's own default git-commit template for this repo specifically. The repo is pushed to the user's personal public GitHub from a work laptop otherwise signed into a company GitHub account; every prior trailer was deliberately stripped and the user asked for none going forward.
