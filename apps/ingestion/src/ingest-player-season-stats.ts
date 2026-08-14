import type { Db } from "@console-next/db";
import {
	playerSeasonStats,
	players,
	seasons,
	teams,
} from "@console-next/db/schema";
import { sql } from "drizzle-orm";

import type { IngestionFailure } from "./ingest-result";
import type { InsertablePlayerSeasonStats } from "./normalize-player-season-stats";
import { normalizePlayerSeasonStats } from "./normalize-player-season-stats";
import type { SportmonksPlayerRaw } from "./sportmonks-types";
import { toErrorMessage } from "./to-error-message";

export interface IngestPlayerSeasonStatsResult {
	fetched: number;
	upserted: number;
	failed: Array<IngestionFailure>;
}

// Depends on players/teams/seasons already being ingested — every FK here is
// resolved via each parent's own sportmonksId, same pattern as
// ingest-fixtures.ts. Each fetched player's `statistics` can carry more than
// one entry for the target season (a mid-season transfer, per the schema's
// own unique(playerId, teamId, seasonId) comment) — every entry becomes its
// own row, not just the first one.
export const ingestPlayerSeasonStats = async (
	db: Db,
	rawPlayers: Array<SportmonksPlayerRaw>,
	targetSeasonSportmonksId: number,
): Promise<IngestPlayerSeasonStatsResult> => {
	const ingestedPlayers = await db
		.select({ id: players.id, sportmonksId: players.sportmonksId })
		.from(players);
	const playerIdBySportmonksId = new Map(
		ingestedPlayers.map((player) => [player.sportmonksId, player.id]),
	);

	const ingestedTeams = await db
		.select({ id: teams.id, sportmonksId: teams.sportmonksId })
		.from(teams);
	const teamIdBySportmonksId = new Map(
		ingestedTeams.map((team) => [team.sportmonksId, team.id]),
	);

	const ingestedSeasons = await db
		.select({ id: seasons.id, sportmonksId: seasons.sportmonksId })
		.from(seasons);
	const seasonIdBySportmonksId = new Map(
		ingestedSeasons.map((season) => [season.sportmonksId, season.id]),
	);

	const rawStatistics = rawPlayers.flatMap((rawPlayer) =>
		rawPlayer.statistics
			.filter((statistic) => statistic.season_id === targetSeasonSportmonksId)
			.map((statistic) => ({ rawPlayer, statistic })),
	);

	const rows: Array<InsertablePlayerSeasonStats> = [];
	const failed: Array<IngestionFailure> = [];

	for (const { rawPlayer, statistic } of rawStatistics) {
		try {
			rows.push(
				normalizePlayerSeasonStats(
					statistic,
					playerIdBySportmonksId,
					teamIdBySportmonksId,
					seasonIdBySportmonksId,
				),
			);
		} catch (error) {
			failed.push({
				id: rawPlayer.id,
				name: rawPlayer.name,
				error: toErrorMessage(error),
			});
		}
	}

	if (rows.length > 0) {
		await db
			.insert(playerSeasonStats)
			.values(rows)
			.onConflictDoUpdate({
				target: [
					playerSeasonStats.playerId,
					playerSeasonStats.teamId,
					playerSeasonStats.seasonId,
				],
				set: {
					minutesPlayed: sql`excluded.minutes_played`,
					goals: sql`excluded.goals`,
					assists: sql`excluded.assists`,
					xg: sql`excluded.xg`,
					goalsPer90: sql`excluded.goals_per90`,
					assistsPer90: sql`excluded.assists_per90`,
					xgPer90: sql`excluded.xg_per90`,
				},
			});
	}

	const result: IngestPlayerSeasonStatsResult = {
		fetched: rawStatistics.length,
		upserted: rows.length,
		failed,
	};
	return result;
};
