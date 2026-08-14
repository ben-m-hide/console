const SPORTMONKS_BASE_URL = "https://api.sportmonks.com/v3/football";

// Only the fields this app actually reads — Sportmonks' League entity has
// many more (image_path, category, has_jerseys, ...), not modeled here.
export interface SportmonksLeagueRaw {
	id: number;
	name: string;
	country?: { name: string } | null;
}

interface SportmonksLeaguesResponse {
	data: SportmonksLeagueRaw[];
}

// Authorization header, not ?api_token= — a query-param token is far more
// likely to leak into logs/proxies (PROJECT.md §11 Phase 4).
export const fetchLeagues = async (
	token: string,
): Promise<SportmonksLeagueRaw[]> => {
	const response = await fetch(
		`${SPORTMONKS_BASE_URL}/leagues?include=country`,
		{
			headers: { Authorization: token },
		},
	);

	if (!response.ok) {
		throw new Error(
			`Sportmonks leagues fetch failed: ${response.status} ${response.statusText}`,
		);
	}

	const body = (await response.json()) as SportmonksLeaguesResponse;
	return body.data;
};
