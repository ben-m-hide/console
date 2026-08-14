import { normalizeSeason } from "./normalize-season";
import { SAMPLE_SEASON_2024 } from "./sportmonks-fixtures";

describe("normalizeSeason", () => {
	it("maps a real Sportmonks season response to the insertable shape, resolving league_id via the map", () => {
		const competitionIdByLeagueId = new Map([[8, 1]]);
		expect(
			normalizeSeason(SAMPLE_SEASON_2024, competitionIdByLeagueId),
		).toEqual({
			sportmonksId: 23614,
			competitionId: 1,
			name: "2024/2025",
			startDate: "2024-08-16",
			endDate: "2025-05-25",
			isCurrent: false,
		});
	});

	it("throws when league_id has no matching ingested competition", () => {
		const emptyMap = new Map<number, number>();
		expect(() => normalizeSeason(SAMPLE_SEASON_2024, emptyMap)).toThrow(
			/no matching ingested competition/,
		);
	});
});
