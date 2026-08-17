import type {
	SportmonksFixtureRaw,
	SportmonksLeagueRaw,
	SportmonksPlayerRaw,
	SportmonksSeasonFixturesRaw,
	SportmonksSeasonRaw,
	SportmonksSquadMemberRaw,
	SportmonksTeamRaw,
} from "./sportmonks-types";

const SPORTMONKS_BASE_URL = "https://api.sportmonks.com/v3/football";

interface SportmonksResponse<T> {
	data: T;
}

// Authorization header, not ?api_token= — a query-param token is far more
// likely to leak into logs/proxies (PROJECT.md §11 Phase 4).
const fetchSportmonks = async <T>(token: string, path: string): Promise<T> => {
	const response = await fetch(`${SPORTMONKS_BASE_URL}${path}`, {
		// biome-ignore lint/style/useNamingConvention: literal HTTP header name, not ours to rename
		headers: { Authorization: token },
	});

	if (!response.ok) {
		throw new Error(
			`Sportmonks fetch failed (${path}): ${response.status} ${response.statusText}`,
		);
	}

	const body = (await response.json()) as SportmonksResponse<T>;
	return body.data;
};

export const fetchLeagues = (
	token: string,
): Promise<Array<SportmonksLeagueRaw>> =>
	fetchSportmonks<Array<SportmonksLeagueRaw>>(
		token,
		"/leagues?include=country",
	);

// One filtered call across all target leagues, not one per league — confirmed
// live that /seasons supports filters=leagueIds:a,b,c (PROJECT.md §3).
export const fetchSeasons = (
	token: string,
	leagueIds: Array<number>,
): Promise<Array<SportmonksSeasonRaw>> =>
	fetchSportmonks<Array<SportmonksSeasonRaw>>(
		token,
		`/seasons?filters=leagueIds:${leagueIds.join(",")}`,
	);

// One request returns the season's fixtures with teams, scores, and state
// included. Not a workaround: date-range filtering
// (/fixtures/between/...?filters=fixtureLeagues:...) is verified live to
// reject with "no access via your current subscription" (Starter plan).
export const fetchSeasonFixtures = async (
	token: string,
	seasonId: number,
): Promise<Array<SportmonksFixtureRaw>> => {
	const season = await fetchSportmonks<SportmonksSeasonFixturesRaw>(
		token,
		`/seasons/${seasonId}?include=fixtures.participants;fixtures.scores;fixtures.state`,
	);
	return season.fixtures;
};

// Used instead of fetchSeasonFixtures when a season's fixtures aren't
// otherwise needed — a finished season's teams, wanted only for FK resolution.
export const fetchSeasonTeams = (
	token: string,
	seasonId: number,
): Promise<Array<SportmonksTeamRaw>> =>
	fetchSportmonks<Array<SportmonksTeamRaw>>(
		token,
		`/teams/seasons/${seasonId}`,
	);

export const fetchTeamSquad = (
	token: string,
	teamId: number,
	seasonId: number,
): Promise<Array<SportmonksSquadMemberRaw>> =>
	fetchSportmonks<Array<SportmonksSquadMemberRaw>>(
		token,
		`/squads/seasons/${seasonId}/teams/${teamId}`,
	);

// Returns the player's profile plus every season's statistics — the caller
// filters down to the season(s) it wants; no per-season endpoint exists.
export const fetchPlayerWithStats = (
	token: string,
	playerId: number,
): Promise<SportmonksPlayerRaw> =>
	fetchSportmonks<SportmonksPlayerRaw>(
		token,
		`/players/${playerId}?include=nationality;position;statistics.details.type`,
	);
