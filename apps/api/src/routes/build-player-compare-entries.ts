// PROJECT.md §4's default peer group: same position, competition, and
// season; 450 minutes (~5 matches) floors out samples too small to percentile.
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

// A mid-season transfer gives two rows for the same season, one per team
// (player_season_stats' unique(playerId, teamId, seasonId)) — keep the
// stint with the most minutes.
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

// Share of the peer group this value outperforms, null when the group is
// empty. The requested player's own row counts toward the group like any
// other, even below the minutes floor themselves.
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

// Caller contract: every playerId must already have a row in rowByPlayerId
// (resolvePlayerRows/a 404 handles the missing case first) and every row's
// position must have a peer group in peersByPosition, even if empty.
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
