import { doublePrecision, index, integer, pgTable } from "drizzle-orm/pg-core";

import { fixtures } from "./fixture.ts";

export const ballPositions = pgTable(
	"ball_positions",
	{
		id: integer().primaryKey().generatedAlwaysAsIdentity(),
		fixtureId: integer()
			.notNull()
			.references(() => fixtures.id),
		// Not named in §2's "Constraints required" paragraph (same gap as
		// seasons — see the comment there), but §3's "every upsert keyed on the
		// Sportmonks ID, not a blind insert" idempotency rule applies here too:
		// re-running ingestion for an already-ingested fixture must upsert each
		// point, not duplicate 900+ rows per re-run.
		sportmonksId: integer().notNull().unique(),
		periodId: integer().notNull(),
		timer: doublePrecision().notNull(),
		x: doublePrecision().notNull(),
		y: doublePrecision().notNull(),
	},
	(table) => [index().on(table.fixtureId)],
);
