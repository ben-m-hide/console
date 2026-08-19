import { relations } from "drizzle-orm";
import { integer, pgTable, text } from "drizzle-orm/pg-core";

import { fixtures } from "./fixture";
import { playerSeasonStats } from "./player-season-stats";
import { squadMemberships } from "./squad-membership";

export const teams = pgTable("teams", {
	id: integer().primaryKey().generatedAlwaysAsIdentity(),
	sportmonksId: integer().notNull().unique(),
	name: text().notNull(),
	shortName: text().notNull(),
	logoUrl: text(),
});

export const teamsRelations = relations(teams, ({ many }) => ({
	// Two distinct relations to the same table (fixtures.homeTeamId vs.
	// awayTeamId) — relationName disambiguates which FK each side pairs
	// with; without it, Drizzle can't tell homeFixtures/awayFixtures apart
	// from fixturesRelations' matching homeTeam/awayTeam.
	homeFixtures: many(fixtures, { relationName: "homeTeam" }),
	awayFixtures: many(fixtures, { relationName: "awayTeam" }),
	playerSeasonStats: many(playerSeasonStats),
	squadMemberships: many(squadMemberships),
}));
