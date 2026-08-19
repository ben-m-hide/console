import { relations } from "drizzle-orm";
import {
	doublePrecision,
	index,
	integer,
	pgTable,
	unique,
} from "drizzle-orm/pg-core";

import { players } from "./player";
import { seasons } from "./season";
import { teams } from "./team";

export const playerSeasonStats = pgTable(
	"player_season_stats",
	{
		id: integer().primaryKey().generatedAlwaysAsIdentity(),
		playerId: integer()
			.notNull()
			.references(() => players.id),
		teamId: integer()
			.notNull()
			.references(() => teams.id),
		seasonId: integer()
			.notNull()
			.references(() => seasons.id),
		minutesPlayed: integer().notNull(),
		goals: integer().notNull(),
		assists: integer().notNull(),
		// xa/xaPer90 (Expected Assists) not modeled — verified live that no such
		// stat type exists under this subscription (only xG does). No data source.
		xg: doublePrecision().notNull(),
		goalsPer90: doublePrecision().notNull(),
		assistsPer90: doublePrecision().notNull(),
		xgPer90: doublePrecision().notNull(),
	},
	(table) => [
		// Keyed on (player, team, season), not (player, season) — a mid-season
		// transfer gets one row per stint, not an overwritten/merged one.
		unique().on(table.playerId, table.teamId, table.seasonId),
		index().on(table.playerId, table.seasonId),
	],
);

export const playerSeasonStatsRelations = relations(
	playerSeasonStats,
	({ one }) => ({
		player: one(players, {
			fields: [playerSeasonStats.playerId],
			references: [players.id],
		}),
		team: one(teams, {
			fields: [playerSeasonStats.teamId],
			references: [teams.id],
		}),
		season: one(seasons, {
			fields: [playerSeasonStats.seasonId],
			references: [seasons.id],
		}),
	}),
);
