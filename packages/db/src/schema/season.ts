import { relations } from "drizzle-orm";
import { boolean, date, integer, pgTable, text } from "drizzle-orm/pg-core";

import { competitions } from "./competition";
import { fixtures } from "./fixture";
import { playerSeasonStats } from "./player-season-stats";
import { squadMemberships } from "./squad-membership";

export const seasons = pgTable("seasons", {
	id: integer().primaryKey().generatedAlwaysAsIdentity(),
	sportmonksId: integer().notNull().unique(),
	competitionId: integer()
		.notNull()
		.references(() => competitions.id),
	name: text().notNull(),
	startDate: date().notNull(),
	endDate: date().notNull(),
	isCurrent: boolean().notNull(),
});

export const seasonsRelations = relations(seasons, ({ one, many }) => ({
	competition: one(competitions, {
		fields: [seasons.competitionId],
		references: [competitions.id],
	}),
	fixtures: many(fixtures),
	playerSeasonStats: many(playerSeasonStats),
	squadMemberships: many(squadMemberships),
}));
