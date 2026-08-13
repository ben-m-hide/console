import {
	BallPositionSchema,
	CompetitionSchema,
	PlayerSeasonStatsSchema,
	TeamSchema,
} from "./index";

describe("TeamSchema (generated, mechanical mapping)", () => {
	it("parses a valid team", () => {
		const result = TeamSchema.safeParse({
			id: 1,
			sportmonksId: 100,
			name: "Arsenal",
			shortName: "ARS",
			logoUrl: "https://example.com/arsenal.png",
		});
		expect(result.success).toBe(true);
	});

	it("accepts a null logoUrl (nullable column)", () => {
		const result = TeamSchema.safeParse({
			id: 1,
			sportmonksId: 100,
			name: "Arsenal",
			shortName: "ARS",
			logoUrl: null,
		});
		expect(result.success).toBe(true);
	});

	it("rejects a non-positive id (identity column)", () => {
		const result = TeamSchema.safeParse({
			id: 0,
			sportmonksId: 100,
			name: "Arsenal",
			shortName: "ARS",
			logoUrl: null,
		});
		expect(result.success).toBe(false);
	});

	it("rejects a non-positive sportmonksId (*Id-suffix column)", () => {
		const result = TeamSchema.safeParse({
			id: 1,
			sportmonksId: -1,
			name: "Arsenal",
			shortName: "ARS",
			logoUrl: null,
		});
		expect(result.success).toBe(false);
	});
});

describe("CompetitionSchema.tier (positive override — not derivable from Drizzle alone)", () => {
	it("rejects a zero tier", () => {
		const result = CompetitionSchema.safeParse({
			id: 1,
			sportmonksId: 100,
			name: "Premier League",
			country: "England",
			tier: 0,
		});
		expect(result.success).toBe(false);
	});

	it("accepts a positive tier", () => {
		const result = CompetitionSchema.safeParse({
			id: 1,
			sportmonksId: 100,
			name: "Premier League",
			country: "England",
			tier: 1,
		});
		expect(result.success).toBe(true);
	});
});

describe("BallPositionSchema.x/y (unbounded override — pitch coordinates can be negative)", () => {
	it("accepts negative coordinates", () => {
		const result = BallPositionSchema.safeParse({
			id: 1,
			fixtureId: 1,
			sportmonksId: 100,
			periodId: 1,
			timer: 12.5,
			x: -10.2,
			y: -5,
		});
		expect(result.success).toBe(true);
	});
});

describe("PlayerSeasonStatsSchema (default nonnegative bound for plain numeric columns)", () => {
	it("rejects negative goals", () => {
		const result = PlayerSeasonStatsSchema.safeParse({
			id: 1,
			playerId: 1,
			teamId: 1,
			seasonId: 1,
			minutesPlayed: 900,
			goals: -1,
			assists: 0,
			xg: 0,
			xa: 0,
			goalsPer90: 0,
			assistsPer90: 0,
			xgPer90: 0,
			xaPer90: 0,
		});
		expect(result.success).toBe(false);
	});

	it("accepts zero as a valid count", () => {
		const result = PlayerSeasonStatsSchema.safeParse({
			id: 1,
			playerId: 1,
			teamId: 1,
			seasonId: 1,
			minutesPlayed: 900,
			goals: 0,
			assists: 0,
			xg: 0,
			xa: 0,
			goalsPer90: 0,
			assistsPer90: 0,
			xgPer90: 0,
			xaPer90: 0,
		});
		expect(result.success).toBe(true);
	});
});
