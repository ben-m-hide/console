// Raw Sportmonks API response shapes, kept in their own file and exempted
// from useNamingConvention (biome.json's overrides) — these deliberately
// mirror Sportmonks' own snake_case wire format field-for-field, not our
// naming. Only the fields each app actually reads are modeled; every entity
// has more (image_path, category, has_jerseys, finished, pending, etc.).

export interface SportmonksLeagueRaw {
	id: number;
	name: string;
	country?: { name: string } | null;
}

export interface SportmonksSeasonRaw {
	id: number;
	league_id: number;
	name: string;
	starting_at: string;
	ending_at: string;
	is_current: boolean;
}

// Real captured shape (id 23614, league_id 8,
// https://api.sportmonks.com/v3/football/leagues/8?include=seasons) —
// shared by tests so the raw snake_case sample lives in the one file this
// package's useNamingConvention override already covers, not duplicated
// inline in every test that needs a realistic fixture.
export const SAMPLE_SEASON_2024: SportmonksSeasonRaw = {
	id: 23614,
	league_id: 8,
	name: "2024/2025",
	starting_at: "2024-08-16",
	ending_at: "2025-05-25",
	is_current: false,
};

export interface SportmonksTeamRaw {
	id: number;
	name: string;
	short_code?: string | null;
	image_path?: string | null;
}

// Real captured shape (id 78, from
// https://api.sportmonks.com/v3/football/teams/seasons/28083), trimmed to
// the fields normalizeTeam actually reads.
export const SAMPLE_TEAM_BRIGHTON: SportmonksTeamRaw = {
	id: 78,
	name: "Brighton & Hove Albion",
	short_code: "BHA",
	image_path: "https://cdn.sportmonks.com/images/soccer/teams/14/78.png",
};

export const SAMPLE_TEAM_WITHOUT_LOGO: SportmonksTeamRaw = {
	id: 78,
	name: "Brighton & Hove Albion",
	short_code: "BHA",
	image_path: null,
};

export const SAMPLE_TEAM_WITHOUT_SHORT_CODE: SportmonksTeamRaw = {
	id: 78,
	name: "Brighton & Hove Albion",
	image_path: null,
};

// A fixture's `participants` include returns full team objects plus which
// side each one played — verified live via
// https://api.sportmonks.com/v3/football/seasons/{id}?include=fixtures.participants.
export interface SportmonksFixtureParticipantRaw extends SportmonksTeamRaw {
	meta: { location: "home" | "away" };
}

// Sportmonks' score-history entries carry many `type_id`s (per-half, current,
// etc.) — 1525 is "Current" (verified against /core/types, 2026-08-14), the
// live/final tally, which is the only one this app reads.
export const SPORTMONKS_CURRENT_SCORE_TYPE_ID = 1525;

export interface SportmonksFixtureScoreRaw {
	type_id: number;
	score: { goals: number; participant: "home" | "away" };
}

export interface SportmonksFixtureStateRaw {
	short_name: string;
}

export interface SportmonksFixtureRaw {
	id: number;
	name: string;
	season_id: number;
	starting_at_timestamp: number;
	participants: Array<SportmonksFixtureParticipantRaw>;
	scores: Array<SportmonksFixtureScoreRaw>;
	state?: SportmonksFixtureStateRaw | null;
}

export interface SportmonksSeasonFixturesRaw {
	fixtures: Array<SportmonksFixtureRaw>;
}

// Real captured shape (fixture 19722194, Fulham vs Chelsea, season 28083,
// https://api.sportmonks.com/v3/football/seasons/28083?include=fixtures.participants;fixtures.scores;fixtures.state) —
// not yet played: empty scores, state "NS".
export const SAMPLE_FIXTURE_UPCOMING: SportmonksFixtureRaw = {
	id: 19722194,
	name: "Fulham vs Chelsea",
	season_id: 28083,
	starting_at_timestamp: 1787598000,
	participants: [
		{
			id: 11,
			name: "Fulham",
			short_code: "FUL",
			image_path: "https://cdn.sportmonks.com/images/soccer/teams/11/11.png",
			meta: { location: "home" },
		},
		{
			id: 18,
			name: "Chelsea",
			short_code: "CHE",
			image_path: "https://cdn.sportmonks.com/images/soccer/teams/18/18.png",
			meta: { location: "away" },
		},
	],
	scores: [],
	state: { short_name: "NS" },
};

// Real captured shape (fixture 19433487, FC Augsburg vs FC Bayern München,
// season 25646, https://api.sportmonks.com/v3/football/seasons/25646?include=fixtures.participants;fixtures.scores;fixtures.state) —
// finished, home 2 away 3.
export const SAMPLE_FIXTURE_FINISHED: SportmonksFixtureRaw = {
	id: 19433487,
	name: "FC Augsburg vs FC Bayern München",
	season_id: 25646,
	starting_at_timestamp: 1756571400,
	participants: [
		{
			id: 503,
			name: "FC Bayern München",
			short_code: "FCB",
			image_path: "https://cdn.sportmonks.com/images/soccer/teams/23/503.png",
			meta: { location: "away" },
		},
		{
			id: 90,
			name: "FC Augsburg",
			short_code: "FCA",
			image_path: "https://cdn.sportmonks.com/images/soccer/teams/26/90.png",
			meta: { location: "home" },
		},
	],
	scores: [
		{ type_id: 1525, score: { goals: 3, participant: "away" } },
		{ type_id: 1525, score: { goals: 2, participant: "home" } },
		{ type_id: 1, score: { goals: 2, participant: "away" } },
		{ type_id: 1, score: { goals: 0, participant: "home" } },
	],
	state: { short_name: "FT" },
};
