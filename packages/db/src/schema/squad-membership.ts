import { integer, pgTable, timestamp } from "drizzle-orm/pg-core";

import { players } from "./player";
import { seasons } from "./season";
import { teams } from "./team";

export const squadMemberships = pgTable("squad_memberships", {
	id: integer().primaryKey().generatedAlwaysAsIdentity(),
	// Every other Sportmonks-sourced table has a UNIQUE(sportmonks_id) to
	// upsert against (§2's "hard prerequisite" for the upsert strategy in §3)
	// — this table was missing it, which would insert duplicate membership
	// rows on every re-run instead of upserting. Caught in review, 2026-08-12.
	sportmonksId: integer().notNull().unique(),
	playerId: integer()
		.notNull()
		.references(() => players.id),
	teamId: integer()
		.notNull()
		.references(() => teams.id),
	seasonId: integer()
		.notNull()
		.references(() => seasons.id),
	shirtNumber: integer(),
	joinedAt: timestamp({ withTimezone: true }).notNull(),
	leftAt: timestamp({ withTimezone: true }),
});
