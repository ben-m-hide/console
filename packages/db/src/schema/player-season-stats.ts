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
		// xa/xaPer90 (Expected Assists) deliberately not modeled — verified live
		// against Sportmonks: no "Expected Assists" stat type exists anywhere
		// under this subscription (only "Expected Goals (xG)" does). No data
		// source, no consumer — same reasoning as competitions.tier's removal.
		xg: doublePrecision().notNull(),
		goalsPer90: doublePrecision().notNull(),
		assistsPer90: doublePrecision().notNull(),
		xgPer90: doublePrecision().notNull(),
	},
	(table) => [
		// §2: keyed on (player, team, season), not (player, season) alone — a
		// mid-season transfer gets one row per stint, not an overwritten/merged one.
		unique().on(table.playerId, table.teamId, table.seasonId),
		index().on(table.playerId, table.seasonId),
	],
);
