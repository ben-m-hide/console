// Real captured Sportmonks API sample data, for tests only — kept out of
// sportmonks-types.ts (types only there), same useNamingConvention exemption.
import type {
	SportmonksFixtureRaw,
	SportmonksPlayerRaw,
	SportmonksPlayerStatisticRaw,
	SportmonksSeasonRaw,
	SportmonksTeamRaw,
} from "./sportmonks-types";

// Real captured shape: id 23614, league_id 8
// (https://api.sportmonks.com/v3/football/leagues/8?include=seasons).
export const SAMPLE_SEASON_2024: SportmonksSeasonRaw = {
	id: 23614,
	league_id: 8,
	name: "2024/2025",
	starting_at: "2024-08-16",
	ending_at: "2025-05-25",
	is_current: false,
};

// Real captured shape: id 78
// (https://api.sportmonks.com/v3/football/teams/seasons/28083).
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

// Real captured shape: fixture 19722194, season 28083, not yet played
// (https://api.sportmonks.com/v3/football/seasons/28083?include=fixtures.participants;fixtures.scores;fixtures.state).
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

// Real captured shape: fixture 19433487, season 25646, finished home 2 away 3
// (https://api.sportmonks.com/v3/football/seasons/25646?include=fixtures.participants;fixtures.scores;fixtures.state).
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

// Real captured shape: player 627, team 78, season 25583
// (https://api.sportmonks.com/v3/football/players/627?include=nationality;position;statistics.details.type).
// Exported separately so tests can reference it without indexing into `statistics`.
export const SAMPLE_PLAYER_WELBECK_STATISTIC: SportmonksPlayerStatisticRaw = {
	player_id: 627,
	team_id: 78,
	season_id: 25583,
	details: [
		{ type: { code: "minutes-played" }, value: { total: 1721 } },
		{ type: { code: "goals" }, value: { total: 13 } },
		{ type: { code: "assists" }, value: { total: 1 } },
		{ type: { code: "expected-goals" }, value: { expected: 11.8634 } },
	],
};

export const SAMPLE_PLAYER_WELBECK: SportmonksPlayerRaw = {
	id: 627,
	name: "Daniel Nii Tackie Mensah Welbeck",
	date_of_birth: "1990-11-26",
	nationality: { name: "England" },
	position: { name: "Attacker" },
	statistics: [SAMPLE_PLAYER_WELBECK_STATISTIC],
};

// Real captured shape: player 37590697, a defender with zero goals/assists/xG
// — those detail types are entirely absent, not present with a zero value.
export const SAMPLE_PLAYER_NO_ATTACKING_STATS_STATISTIC: SportmonksPlayerStatisticRaw =
	{
		player_id: 37590697,
		team_id: 78,
		season_id: 25583,
		details: [
			{ type: { code: "minutes-played" }, value: { total: 201 } },
			{ type: { code: "fouls" }, value: { total: 4 } },
		],
	};

export const SAMPLE_PLAYER_NO_ATTACKING_STATS: SportmonksPlayerRaw = {
	id: 37590697,
	name: "Diego Coppola",
	date_of_birth: "2004-02-17",
	nationality: { name: "Italy" },
	position: { name: "Defender" },
	statistics: [SAMPLE_PLAYER_NO_ATTACKING_STATS_STATISTIC],
};
