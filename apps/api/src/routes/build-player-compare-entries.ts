// PROJECT.md §4's recommended default: same position, same competition
// (implied by seasonId — a season belongs to exactly one competition), same
// season, minimum 450 minutes played (~5 full matches) — small samples make
// percentiles meaningless.
export const MINIMUM_MINUTES_FOR_PEER_GROUP = 450;

export interface PlayerCompareRow {
	playerId: number;
	minutesPlayed: number;
	goals: number;
	assists: number;
	xg: number;
	goalsPer90: number;
	assistsPer90: number;
	xgPer90: number;
	name: string;
	position: string;
	team: string;
}

export interface PeerStats {
	goalsPer90: number;
	assistsPer90: number;
	xgPer90: number;
}

export interface ResolvedPlayerRows {
	rowByPlayerId: Map<number, PlayerCompareRow>;
	missingPlayerIds: Array<number>;
}

// A mid-season transfer gives a player two rows for the same season (one per
// team, per player_season_stats' own unique(playerId, teamId, seasonId)) —
// compare against their stint with the most minutes.
export const resolvePlayerRows = (
	playerIds: Array<number>,
	rows: Array<PlayerCompareRow>,
): ResolvedPlayerRows => {
	const rowByPlayerId = new Map<number, PlayerCompareRow>();
	for (const row of rows) {
		const existing = rowByPlayerId.get(row.playerId);
		if (!existing || row.minutesPlayed > existing.minutesPlayed) {
			rowByPlayerId.set(row.playerId, row);
		}
	}

	const missingPlayerIds = playerIds.filter(
		(playerId) => !rowByPlayerId.has(playerId),
	);

	const result: ResolvedPlayerRows = { rowByPlayerId, missingPlayerIds };
	return result;
};

// Percentile: share of the (position + season) peer group, minutes-floor
// applied, that this player outperforms — null when the peer group is empty.
// The requested player's own row counts toward the peer group like anyone
// else's, even if that player themselves is below the minutes floor.
const percentileOf = (
	value: number,
	peerValues: Array<number>,
): number | null =>
	peerValues.length > 0
		? (peerValues.filter((peerValue) => peerValue < value).length /
				peerValues.length) *
			100
		: null;

export interface PlayerCompareEntry {
	playerId: number;
	name: string;
	position: string;
	team: string;
	seasonId: number;
	stats: {
		minutesPlayed: number;
		goals: number;
		assists: number;
		xg: number;
		goalsPer90: number;
		assistsPer90: number;
		xgPer90: number;
	};
	percentiles: {
		goalsPer90: number | null;
		assistsPer90: number | null;
		xgPer90: number | null;
	};
	peerGroupSize: number;
}

// Every playerId must already have a row in rowByPlayerId (the caller resolves
// missing ids via resolvePlayerRows and handles that case, e.g. a 404, before
// calling this) and every row's position must have a peer group in
// peersByPosition, even if empty.
export const buildCompareEntries = (
	playerIds: Array<number>,
	seasonId: number,
	rowByPlayerId: Map<number, PlayerCompareRow>,
	peersByPosition: Map<string, Array<PeerStats>>,
): Array<PlayerCompareEntry> =>
	playerIds.map((playerId) => {
		// biome-ignore lint/style/noNonNullAssertion: caller contract — every playerId must already be resolved (see docstring above)
		const row = rowByPlayerId.get(playerId)!;
		// biome-ignore lint/style/noNonNullAssertion: caller contract — every row's position must have a peer group (see docstring above)
		const peers = peersByPosition.get(row.position)!;

		const entry: PlayerCompareEntry = {
			playerId: row.playerId,
			name: row.name,
			position: row.position,
			team: row.team,
			seasonId,
			stats: {
				minutesPlayed: row.minutesPlayed,
				goals: row.goals,
				assists: row.assists,
				xg: row.xg,
				goalsPer90: row.goalsPer90,
				assistsPer90: row.assistsPer90,
				xgPer90: row.xgPer90,
			},
			percentiles: {
				goalsPer90: percentileOf(
					row.goalsPer90,
					peers.map((peer) => peer.goalsPer90),
				),
				assistsPer90: percentileOf(
					row.assistsPer90,
					peers.map((peer) => peer.assistsPer90),
				),
				xgPer90: percentileOf(
					row.xgPer90,
					peers.map((peer) => peer.xgPer90),
				),
			},
			peerGroupSize: peers.length,
		};
		return entry;
	});
