import { normalizePlayerSeasonStats } from "./normalize-player-season-stats";
import {
	SAMPLE_PLAYER_NO_ATTACKING_STATS_STATISTIC,
	SAMPLE_PLAYER_WELBECK_STATISTIC,
} from "./sportmonks-fixtures";

describe("normalizePlayerSeasonStats", () => {
	it("maps a real Sportmonks statistic entry, computing per-90 rates", () => {
		const playerIdBySportmonksId = new Map([[627, 1]]);
		const teamIdBySportmonksId = new Map([[78, 10]]);
		const seasonIdBySportmonksId = new Map([[25583, 100]]);

		const result = normalizePlayerSeasonStats(
			SAMPLE_PLAYER_WELBECK_STATISTIC,
			playerIdBySportmonksId,
			teamIdBySportmonksId,
			seasonIdBySportmonksId,
		);

		expect(result).toEqual({
			playerId: 1,
			teamId: 10,
			seasonId: 100,
			minutesPlayed: 1721,
			goals: 13,
			assists: 1,
			xg: 11.8634,
			goalsPer90: (13 / 1721) * 90,
			assistsPer90: (1 / 1721) * 90,
			xgPer90: (11.8634 / 1721) * 90,
		});
	});

	it("treats an absent stat type as zero, not a throw", () => {
		const playerIdBySportmonksId = new Map([[37590697, 2]]);
		const teamIdBySportmonksId = new Map([[78, 10]]);
		const seasonIdBySportmonksId = new Map([[25583, 100]]);

		const result = normalizePlayerSeasonStats(
			SAMPLE_PLAYER_NO_ATTACKING_STATS_STATISTIC,
			playerIdBySportmonksId,
			teamIdBySportmonksId,
			seasonIdBySportmonksId,
		);

		expect(result.goals).toBe(0);
		expect(result.assists).toBe(0);
		expect(result.xg).toBe(0);
		expect(result.minutesPlayed).toBe(201);
	});

	it("throws when player_id has no matching ingested player", () => {
		const emptyPlayerMap = new Map<number, number>();
		const teamIdBySportmonksId = new Map([[78, 10]]);
		const seasonIdBySportmonksId = new Map([[25583, 100]]);

		expect(() =>
			normalizePlayerSeasonStats(
				SAMPLE_PLAYER_WELBECK_STATISTIC,
				emptyPlayerMap,
				teamIdBySportmonksId,
				seasonIdBySportmonksId,
			),
		).toThrow(/no matching ingested player/);
	});

	it("throws when team_id has no matching ingested team", () => {
		const playerIdBySportmonksId = new Map([[627, 1]]);
		const emptyTeamMap = new Map<number, number>();
		const seasonIdBySportmonksId = new Map([[25583, 100]]);

		expect(() =>
			normalizePlayerSeasonStats(
				SAMPLE_PLAYER_WELBECK_STATISTIC,
				playerIdBySportmonksId,
				emptyTeamMap,
				seasonIdBySportmonksId,
			),
		).toThrow(/no matching ingested team/);
	});

	it("throws when season_id has no matching ingested season", () => {
		const playerIdBySportmonksId = new Map([[627, 1]]);
		const teamIdBySportmonksId = new Map([[78, 10]]);
		const emptySeasonMap = new Map<number, number>();

		expect(() =>
			normalizePlayerSeasonStats(
				SAMPLE_PLAYER_WELBECK_STATISTIC,
				playerIdBySportmonksId,
				teamIdBySportmonksId,
				emptySeasonMap,
			),
		).toThrow(/no matching ingested season/);
	});
});
