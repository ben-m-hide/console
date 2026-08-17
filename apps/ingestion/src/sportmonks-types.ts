// Raw Sportmonks API response shapes, exempted from useNamingConvention
// (biome.json's overrides) — mirrors Sportmonks' own snake_case field-for-field.
// Only the fields each app reads are modeled. Real sample data for tests
// lives in sportmonks-fixtures.ts, not here — see docs/conventions/typescript.md's
// "Where types live".

// Shared by SportmonksLeagueRaw.country and SportmonksPlayerRaw.nationality —
// the same underlying Sportmonks "Country" entity, not a coincidental match.
export interface SportmonksCountryRaw {
	name: string;
}

export interface SportmonksLeagueRaw {
	id: number;
	name: string;
	country?: SportmonksCountryRaw | null;
}

export interface SportmonksSeasonRaw {
	id: number;
	league_id: number;
	name: string;
	starting_at: string;
	ending_at: string;
	is_current: boolean;
}

export interface SportmonksTeamRaw {
	id: number;
	name: string;
	short_code?: string | null;
	image_path?: string | null;
}

export interface SportmonksParticipantMetaRaw {
	location: "home" | "away";
}

// `participants` returns full team objects plus which side each played —
// verified live via seasons/{id}?include=fixtures.participants.
export interface SportmonksFixtureParticipantRaw extends SportmonksTeamRaw {
	meta: SportmonksParticipantMetaRaw;
}

// Score-history entries carry many type_ids (per-half, current, etc.) — 1525
// is "Current" (verified against /core/types, 2026-08-14), the only one this app reads.
export const SPORTMONKS_CURRENT_SCORE_TYPE_ID = 1525;

export interface SportmonksScoreValueRaw {
	goals: number;
	participant: "home" | "away";
}

export interface SportmonksFixtureScoreRaw {
	type_id: number;
	score: SportmonksScoreValueRaw;
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

export interface SportmonksSquadMemberRaw {
	player_id: number;
}

export interface SportmonksStatisticTypeRaw {
	code: string;
}

// `value` shape varies by type ("total" for counts, "expected" for xG). A
// type absent from `details[]` means zero, not missing — Sportmonks omits
// zero-valued categories entirely (verified live).
export interface SportmonksStatisticValueRaw {
	total?: number;
	expected?: number;
}

export interface SportmonksStatisticDetailRaw {
	type: SportmonksStatisticTypeRaw;
	value: SportmonksStatisticValueRaw;
}

export interface SportmonksPlayerStatisticRaw {
	player_id: number;
	team_id: number;
	season_id: number;
	details: Array<SportmonksStatisticDetailRaw>;
}

export interface SportmonksPositionRaw {
	name: string;
}

export interface SportmonksPlayerRaw {
	id: number;
	name: string;
	date_of_birth: string;
	nationality?: SportmonksCountryRaw | null;
	position?: SportmonksPositionRaw | null;
	statistics: Array<SportmonksPlayerStatisticRaw>;
}

// Stat type codes this app reads, verified against /core/types and real
// payloads, 2026-08-14 — no "Expected Assists" found anywhere under this
// subscription, hence no xa/xaPer90 (see packages/db/src/schema/player-season-stats.ts).
export const SPORTMONKS_STAT_CODE = {
	minutesPlayed: "minutes-played",
	goals: "goals",
	assists: "assists",
	expectedGoals: "expected-goals",
} as const;
