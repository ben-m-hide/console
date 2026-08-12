import { boolean, date, integer, pgTable, text } from "drizzle-orm/pg-core";

import { competitions } from "./competition.ts";

export const seasons = pgTable("seasons", {
	id: integer().primaryKey().generatedAlwaysAsIdentity(),
	// PROJECT.md §2's "Constraints required for the upsert strategy" paragraph
	// only names competitions/teams/players/fixtures for UNIQUE(sportmonks_id) —
	// seasons is omitted there despite listing sportmonks_id as a column. Kept
	// unique here anyway: §3's upsert strategy depends on every Sportmonks-keyed
	// entity being unique-constrained, and there's no stated reason seasons
	// would be exempt — treating the omission as a gap, not a deliberate call.
	sportmonksId: integer().notNull().unique(),
	competitionId: integer()
		.notNull()
		.references(() => competitions.id),
	name: text().notNull(),
	startDate: date().notNull(),
	endDate: date().notNull(),
	isCurrent: boolean().notNull(),
});
