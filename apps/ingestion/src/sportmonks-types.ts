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
