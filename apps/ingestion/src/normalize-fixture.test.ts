import { normalizeFixture } from "./normalize-fixture";
import {
	SAMPLE_FIXTURE_FINISHED,
	SAMPLE_FIXTURE_UPCOMING,
} from "./sportmonks-types";

describe("normalizeFixture", () => {
	it("maps a not-yet-played fixture, leaving scores null", () => {
		const seasonIdBySportmonksId = new Map([[28083, 1]]);
		const teamIdBySportmonksId = new Map([
			[11, 10],
			[18, 20],
		]);

		expect(
			normalizeFixture(
				SAMPLE_FIXTURE_UPCOMING,
				seasonIdBySportmonksId,
				teamIdBySportmonksId,
			),
		).toEqual({
			sportmonksId: 19722194,
			seasonId: 1,
			homeTeamId: 10,
			awayTeamId: 20,
			kickoffAt: new Date(1787598000 * 1000).toISOString(),
			status: "NS",
			homeScore: null,
			awayScore: null,
		});
	});

	it("maps a finished fixture, reading the Current score entries", () => {
		const seasonIdBySportmonksId = new Map([[25646, 2]]);
		const teamIdBySportmonksId = new Map([
			[503, 30],
			[90, 40],
		]);

		expect(
			normalizeFixture(
				SAMPLE_FIXTURE_FINISHED,
				seasonIdBySportmonksId,
				teamIdBySportmonksId,
			),
		).toEqual({
			sportmonksId: 19433487,
			seasonId: 2,
			homeTeamId: 40,
			awayTeamId: 30,
			kickoffAt: new Date(1756571400 * 1000).toISOString(),
			status: "FT",
			homeScore: 2,
			awayScore: 3,
		});
	});

	it("throws when season_id has no matching ingested season", () => {
		const emptySeasonMap = new Map<number, number>();
		const teamIdBySportmonksId = new Map([
			[11, 10],
			[18, 20],
		]);
		expect(() =>
			normalizeFixture(
				SAMPLE_FIXTURE_UPCOMING,
				emptySeasonMap,
				teamIdBySportmonksId,
			),
		).toThrow(/no matching ingested season/);
	});

	it("throws when a participant has no matching ingested team", () => {
		const seasonIdBySportmonksId = new Map([[28083, 1]]);
		const emptyTeamMap = new Map<number, number>();
		expect(() =>
			normalizeFixture(
				SAMPLE_FIXTURE_UPCOMING,
				seasonIdBySportmonksId,
				emptyTeamMap,
			),
		).toThrow(/no matching ingested team/);
	});
});
