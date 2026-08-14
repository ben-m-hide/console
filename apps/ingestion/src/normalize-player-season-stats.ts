import { PlayerSeasonStatsSchema } from "@console-next/shared";

import {
	SPORTMONKS_STAT_CODE,
	type SportmonksPlayerStatisticRaw,
	type SportmonksStatisticDetailRaw,
} from "./sportmonks-types";

// id is DB-generated (identity column) — see normalize-competition.ts for the
// same reasoning.
const InsertablePlayerSeasonStatsSchema = PlayerSeasonStatsSchema.omit({
	id: true,
});

export type InsertablePlayerSeasonStats = ReturnType<
	typeof InsertablePlayerSeasonStatsSchema.parse
>;

// A stat type absent from details[] means zero, not missing data — Sportmonks
// omits zero-valued categories entirely (verified: a defender's real profile
// had no "Goals"/"Assists"/"Expected Goals" entries at all).
const readStatTotal = (
	details: Array<SportmonksStatisticDetailRaw>,
	code: string,
): number =>
	details.find((detail) => detail.type.code === code)?.value.total ?? 0;

const readStatExpected = (
	details: Array<SportmonksStatisticDetailRaw>,
	code: string,
): number =>
	details.find((detail) => detail.type.code === code)?.value.expected ?? 0;

const per90 = (total: number, minutesPlayed: number): number =>
	minutesPlayed > 0 ? (total / minutesPlayed) * 90 : 0;

export const normalizePlayerSeasonStats = (
	raw: SportmonksPlayerStatisticRaw,
	playerIdBySportmonksId: Map<number, number>,
	teamIdBySportmonksId: Map<number, number>,
	seasonIdBySportmonksId: Map<number, number>,
): InsertablePlayerSeasonStats => {
	const playerId = playerIdBySportmonksId.get(raw.player_id);
	if (playerId === undefined) {
		throw new Error(
			`player statistic references player_id ${raw.player_id}, which has no matching ingested player`,
		);
	}

	const teamId = teamIdBySportmonksId.get(raw.team_id);
	if (teamId === undefined) {
		throw new Error(
			`player statistic (player_id ${raw.player_id}) references team_id ${raw.team_id}, which has no matching ingested team`,
		);
	}

	const seasonId = seasonIdBySportmonksId.get(raw.season_id);
	if (seasonId === undefined) {
		throw new Error(
			`player statistic (player_id ${raw.player_id}) references season_id ${raw.season_id}, which has no matching ingested season`,
		);
	}

	const minutesPlayed = readStatTotal(
		raw.details,
		SPORTMONKS_STAT_CODE.minutesPlayed,
	);
	const goals = readStatTotal(raw.details, SPORTMONKS_STAT_CODE.goals);
	const assists = readStatTotal(raw.details, SPORTMONKS_STAT_CODE.assists);
	const xg = readStatExpected(raw.details, SPORTMONKS_STAT_CODE.expectedGoals);

	return InsertablePlayerSeasonStatsSchema.parse({
		playerId,
		teamId,
		seasonId,
		minutesPlayed,
		goals,
		assists,
		xg,
		goalsPer90: per90(goals, minutesPlayed),
		assistsPer90: per90(assists, minutesPlayed),
		xgPer90: per90(xg, minutesPlayed),
	});
};
