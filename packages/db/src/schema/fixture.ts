import { relations } from "drizzle-orm";
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

export const fixturesRelations = relations(fixtures, ({ one }) => ({
	season: one(seasons, {
		fields: [fixtures.seasonId],
		references: [seasons.id],
	}),
	// relationName pairs each side with team.ts's matching homeFixtures/
	// awayFixtures many() — see the comment there.
	homeTeam: one(teams, {
		fields: [fixtures.homeTeamId],
		references: [teams.id],
		relationName: "homeTeam",
	}),
	awayTeam: one(teams, {
		fields: [fixtures.awayTeamId],
		references: [teams.id],
		relationName: "awayTeam",
	}),
}));
