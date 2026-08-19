import { relations } from "drizzle-orm";
import { date, integer, pgTable, text } from "drizzle-orm/pg-core";

import { playerSeasonStats } from "./player-season-stats";
import { squadMemberships } from "./squad-membership";

export const players = pgTable("players", {
	id: integer().primaryKey().generatedAlwaysAsIdentity(),
	sportmonksId: integer().notNull().unique(),
	name: text().notNull(),
	dateOfBirth: date().notNull(),
	nationality: text().notNull(),
	position: text().notNull(),
});

export const playersRelations = relations(players, ({ many }) => ({
	playerSeasonStats: many(playerSeasonStats),
	squadMemberships: many(squadMemberships),
}));
