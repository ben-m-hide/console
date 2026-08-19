import { normalizeCompetition } from "./normalize-competition";
import { type SportmonksLeagueRaw } from "./sportmonks-types";

// Real captured shape (id 8, https://api.sportmonks.com/v3/football/leagues/8?include=country),
// trimmed to the fields normalizeCompetition actually reads.
const premierLeague: SportmonksLeagueRaw = {
	id: 8,
	name: "Premier League",
	country: { name: "England" },
};

describe("normalizeCompetition", () => {
	it("maps a real Sportmonks league response to the insertable shape", () => {
		expect(normalizeCompetition(premierLeague)).toEqual({
			sportmonksId: 8,
			name: "Premier League",
			country: "England",
		});
	});

	it("throws when country is missing (include=country was omitted)", () => {
		const withoutCountry: SportmonksLeagueRaw = {
			id: 8,
			name: "Premier League",
		};
		expect(() => normalizeCompetition(withoutCountry)).toThrow(/no country/);
	});

	it("throws when country is null", () => {
		const nullCountry: SportmonksLeagueRaw = {
			id: 8,
			name: "Premier League",
			country: null,
		};
		expect(() => normalizeCompetition(nullCountry)).toThrow(/no country/);
	});
});
