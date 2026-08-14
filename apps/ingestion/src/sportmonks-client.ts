import type {
	SportmonksFixtureRaw,
	SportmonksLeagueRaw,
	SportmonksSeasonFixturesRaw,
	SportmonksSeasonRaw,
} from "./sportmonks-types";

const SPORTMONKS_BASE_URL = "https://api.sportmonks.com/v3/football";

interface SportmonksResponse<T> {
	data: T;
}

// Authorization header, not ?api_token= — a query-param token is far more
// likely to leak into logs/proxies (PROJECT.md §11 Phase 4). Shared by every
// entity fetcher below — extracted once a second one (fetchSeasons) actually
// needed the same shape, not before.
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

// A single filtered call across all target leagues, not one call per league —
// confirmed against a live call that Sportmonks' /seasons endpoint supports
// filters=leagueIds:a,b,c (comma-separated), same "combine into one request"
// discipline as leagues' include=country (PROJECT.md §3).
export const fetchSeasons = (
	token: string,
	leagueIds: Array<number>,
): Promise<Array<SportmonksSeasonRaw>> =>
	fetchSportmonks<Array<SportmonksSeasonRaw>>(
		token,
		`/seasons?filters=leagueIds:${leagueIds.join(",")}`,
	);

// One request returns the season's full fixture list, each fixture already
// carrying its teams (participants), score history, and match state — a
// stronger form of PROJECT.md §3's "combine via include=" than a separate
// per-entity call. Verified live: date-range filtering
// (`/fixtures/between/...?filters=fixtureLeagues:...`) returns "no access via
// your current subscription" (Starter plan) — this season-scoped include
// avoids that gate entirely, so it's the actual approach, not a workaround.
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
