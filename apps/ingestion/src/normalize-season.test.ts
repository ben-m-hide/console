import { normalizeSeason } from "./normalize-season";
import type { SportmonksSeasonRaw } from "./sportmonks-client";

// Real captured shape (id 23614, league_id 8,
// https://api.sportmonks.com/v3/football/leagues/8?include=seasons),
// trimmed to the fields normalizeSeason actually reads.
const season2024: SportmonksSeasonRaw = {
	id: 23614,
	league_id: 8,
	name: "2024/2025",
	starting_at: "2024-08-16",
	ending_at: "2025-05-25",
	is_current: false,
};

describe("normalizeSeason", () => {
	it("maps a real Sportmonks season response to the insertable shape, resolving league_id via the map", () => {
		const competitionIdByLeagueId = new Map([[8, 1]]);
		expect(normalizeSeason(season2024, competitionIdByLeagueId)).toEqual({
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
		expect(() => normalizeSeason(season2024, emptyMap)).toThrow(
			/no matching ingested competition/,
		);
	});
});
