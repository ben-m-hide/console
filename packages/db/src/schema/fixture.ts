import { integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";

import { seasons } from "./season";
import { teams } from "./team";

export const fixtures = pgTable("fixtures", {
	id: integer().primaryKey().generatedAlwaysAsIdentity(),
	sportmonksId: integer().notNull().unique(),
	seasonId: integer()
		.notNull()
		.references(() => seasons.id),
	homeTeamId: integer()
		.notNull()
		.references(() => teams.id),
	awayTeamId: integer()
		.notNull()
		.references(() => teams.id),
	kickoffAt: timestamp({ withTimezone: true }).notNull(),
	status: text().notNull(),
	homeScore: integer(),
	awayScore: integer(),
});
