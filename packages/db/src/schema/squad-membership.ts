import { relations } from "drizzle-orm";
import { integer, pgTable, timestamp } from "drizzle-orm/pg-core";

import { players } from "./player";
import { seasons } from "./season";
import { teams } from "./team";

export const squadMemberships = pgTable("squad_memberships", {
	id: integer().primaryKey().generatedAlwaysAsIdentity(),
	// Every Sportmonks-sourced table needs UNIQUE(sportmonks_id) to upsert
	// against — this table was missing it, caught in review 2026-08-12.
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

export const squadMembershipsRelations = relations(
	squadMemberships,
	({ one }) => ({
		player: one(players, {
			fields: [squadMemberships.playerId],
			references: [players.id],
		}),
		team: one(teams, {
			fields: [squadMemberships.teamId],
			references: [teams.id],
		}),
		season: one(seasons, {
			fields: [squadMemberships.seasonId],
			references: [seasons.id],
		}),
	}),
);
