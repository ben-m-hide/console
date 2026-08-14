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

// Only the fields this app actually reads — Sportmonks' League entity has
// many more (image_path, category, has_jerseys, ...), not modeled here.
export interface SportmonksLeagueRaw {
	id: number;
	name: string;
	country?: { name: string } | null;
}

export const fetchLeagues = (token: string): Promise<SportmonksLeagueRaw[]> =>
	fetchSportmonks<SportmonksLeagueRaw[]>(token, "/leagues?include=country");

// Only the fields this app actually reads — Sportmonks' Season entity also
// has finished/pending/tie_breaker_rule_id/etc., not modeled here.
export interface SportmonksSeasonRaw {
	id: number;
	league_id: number;
	name: string;
	starting_at: string;
	ending_at: string;
	is_current: boolean;
}

// A single filtered call across all target leagues, not one call per league —
// confirmed against a live call that Sportmonks' /seasons endpoint supports
// filters=leagueIds:a,b,c (comma-separated), same "combine into one request"
// discipline as leagues' include=country (PROJECT.md §3).
export const fetchSeasons = (
	token: string,
	leagueIds: number[],
): Promise<SportmonksSeasonRaw[]> =>
	fetchSportmonks<SportmonksSeasonRaw[]>(
		token,
		`/seasons?filters=leagueIds:${leagueIds.join(",")}`,
	);
