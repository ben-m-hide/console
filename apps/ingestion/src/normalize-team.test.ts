import { normalizeTeam } from "./normalize-team";
import {
	SAMPLE_TEAM_BRIGHTON,
	SAMPLE_TEAM_WITHOUT_LOGO,
	SAMPLE_TEAM_WITHOUT_SHORT_CODE,
} from "./sportmonks-types";

describe("normalizeTeam", () => {
	it("maps a real Sportmonks team response to the insertable shape", () => {
		expect(normalizeTeam(SAMPLE_TEAM_BRIGHTON)).toEqual({
			sportmonksId: 78,
			name: "Brighton & Hove Albion",
			shortName: "BHA",
			logoUrl: "https://cdn.sportmonks.com/images/soccer/teams/14/78.png",
		});
	});

	it("normalizes a missing logoUrl to null rather than undefined", () => {
		expect(normalizeTeam(SAMPLE_TEAM_WITHOUT_LOGO).logoUrl).toBeNull();
	});

	it("throws when short_code is missing", () => {
		expect(() => normalizeTeam(SAMPLE_TEAM_WITHOUT_SHORT_CODE)).toThrow(
			/no short_code/,
		);
	});
});
