# Design

A map of the system's design surfaces. One document per surface, each answering "what is this, how does it fit together, and what constrains it".

## Why this exists separately from `adr/` and `plans/`

The three directories answer different questions, and a design doc fits none of the other two:

| Directory      | Answers                                               | Lifecycle                                            |
| -------------- | ----------------------------------------------------- | ---------------------------------------------------- |
| `docs/adr/`    | "Why did we choose X over Y?" — one decision each     | Immutable once accepted; superseded, never edited    |
| `docs/plans/`  | "What are we about to do, and in what order?"         | Frozen at approval; the record of what was agreed    |
| `docs/design/` | "What is this surface, and how does it fit together?" | **Living** — updated as the surface actually changes |

A design doc is the shared reference the other two point at. Decisions arising from one still become ADRs; work arising from one still becomes a plan. The design doc is what stops each ADR from re-explaining the whole surface, and each plan from re-deriving the same structure.

**Living, not frozen** is the key difference from `plans/`. A plan is deliberately historical — never edited after approval, so it stays an honest record of what was agreed. A design doc is the opposite: if it drifts from the code, the doc is wrong and gets fixed.

## The map

### Frontend

| Document                                               | Covers                                                                                | Status                               |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------- | ------------------------------------ |
| [frontend-ui-ux.md](./frontend-ui-ux.md)               | Feature decomposition, navigation/IA, screens, visual language, accessibility, states | Draft — only the index screen exists |
| [frontend-architecture.md](./frontend-architecture.md) | Code organisation, data loading, state boundaries                                     | Draft — not yet applied to the code  |

### Not yet written

Surfaces that will need their own document once there is something real to describe. Listed so the gaps are visible rather than forgotten — **not** a commitment to write them on any schedule.

- **Backend/API design** — route surface, error envelope, pagination and filtering conventions. Currently spread across `PROJECT.md` §4 and the individual route files.
- **Ingestion design** — pipeline shape, rate-limit handling, failure isolation, scheduling. Currently in `PROJECT.md` §3 and `apps/ingestion`'s own notes.
- **Data/domain model** — currently `PROJECT.md` §2 plus `packages/db`'s schema.

## Splitting convention

Documents start whole and get **carved up as an area earns its own file** — not pre-split into stubs. The trigger is real: a section grows past comfortable reading, or two documents start needing to reference the same section, or a section stops being specific to its parent surface.

When splitting:

- The parent keeps a short section with a pointer, so the map stays navigable from any entry point.
- **Exactly one document owns each thing.** The others reference it. Duplicating a definition across two design docs is how they silently diverge.
- Update this map in the same commit as the split.

Likely future splits, flagged early because they are already cross-cutting rather than frontend-specific:

- **Accessibility** — currently `frontend-ui-ux.md` §5, but WCAG obligations apply to any surface that renders. Carve out when a second surface needs it.
- **Visual language / design tokens** — currently `frontend-ui-ux.md` §4. Carve out when tokens outgrow a section, or when the data-visualisation palette needs its own measured-contrast reference table.

## Conventions

- Name a document for its surface (`frontend-ui-ux.md`), not for a project phase or a date.
- State what is **decided**, what is **deferred with a named trigger**, and what is **blocked and on what**. A design doc describing only the happy end-state is useless for sequencing work.
- Cite evidence for non-obvious claims and mark unverified ones. "We researched this" without the finding is not evidence.
- Record deliberate weaknesses as deliberate. A thin screen kept for a real reason should say so, so nobody later reads it as an oversight.
- When a design doc and the code disagree, fix whichever is wrong — and say which, in the commit.
