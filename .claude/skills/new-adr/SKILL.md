---
name: new-adr
description: Create a new Architecture Decision Record for console-next, following this project's numbering and section convention. Use when a decision was just made (or is being made) that's hard to reverse, would be surprising without context, and involved a genuine trade-off between real alternatives.
---

Before creating a file, verify all three of these are true (see `docs/adr/README.md`):

1. **Hard to reverse** — the cost of changing course later is meaningful.
2. **Surprising without context** — a future reader would wonder "why did they do it this way?"
3. **The result of a real trade-off** — there were genuine alternatives, and one was picked for specific reasons.

If any of the three is false, don't create an ADR — a code comment or a `TODO.md`/README line is enough. Most changes don't need one.

## Steps

1. Find the next number: check `docs/adr/` for the highest existing `NNNN-*.md`, increment by one, zero-padded to 4 digits.
2. Pick a short, descriptive slug for the filename: `docs/adr/NNNN-slug.md`.
3. Write it using this project's established structure (fuller than the bare-minimum ADR template, matching every existing ADR here — see `docs/adr/0007-aws-s3-cloudfront-hosting.md` or `0008-hono-rest-openapi-backend.md` for real examples):

   ```md
   # {Short title of the decision}

   ## Status

   Accepted — {one line on what's actually built/verified so far, and what isn't yet}.

   ## Context

   {Why this decision needed making — constraints, what triggered it.}

   ## Decision

   {What was chosen and why, including the specific reasoning — not just the name of the winner.}

   ## What was actually built

   {Concrete files/config, only if there's real implementation to point to yet.}

   ## Consequences / known gaps, deliberately not resolved here

   {Real trade-offs and follow-up items — link `TODO.md` items this creates.}

   ## Considered and rejected

   {Each real alternative, with the specific reason it lost — not a generic pro/con list.}
   ```

4. Add a row to the table in `docs/adr/README.md` (number, title, status link).
5. If the decision changes anything `README.md` documents (stack, commands, known quirks), update the relevant section there too — link to the new ADR rather than duplicating its reasoning.
6. If the decision leaves anything unresolved, add it to `TODO.md` under the relevant section, not just inside the ADR.
7. Run `bun run format:md` and `bun run lint` before finishing.

Every claim in the ADR should be something actually verified in this session (a command run, a doc fetched, a file read) — not asserted from memory. That's the standing rule for this project (`.claude/CLAUDE.md`), and it's especially important in an ADR, since it's the document future sessions will trust without re-checking.
