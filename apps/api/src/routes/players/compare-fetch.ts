import { type Db } from "@console-next/db";
import { playerSeasonStats, players, teams } from "@console-next/db/schema";
import { and, eq, gte, inArray } from "drizzle-orm";

import {
	MINIMUM_MINUTES_FOR_PEER_GROUP,
	type PeerStats,
	type PlayerCompareRow,
} from "./compare-entries";

// DB-touching, deliberately untested — same reasoning as apps/ingestion's
// ingest-*.ts orchestrators: avoids a DB-mocking abstraction. parseCompareQuery
// (compare-query.ts) stays a separate, pure, tested file for exactly this
// reason — it must not transitively import @console-next/db, which pulls in
// drizzle-orm/bun-sql's `bun` module that Vitest (unlike Bun) can't load.
export const fetchRequestedRows = async (
	db: Db,
	seasonId: number,
	playerIds: Array<number>,
): Promise<Array<PlayerCompareRow>> =>
	db
		.select({
			playerId: playerSeasonStats.playerId,
			minutesPlayed: playerSeasonStats.minutesPlayed,
			goals: playerSeasonStats.goals,
			assists: playerSeasonStats.assists,
			xg: playerSeasonStats.xg,
			goalsPer90: playerSeasonStats.goalsPer90,
			assistsPer90: playerSeasonStats.assistsPer90,
			xgPer90: playerSeasonStats.xgPer90,
			name: players.name,
			position: players.position,
			team: teams.name,
		})
		.from(playerSeasonStats)
		.innerJoin(players, eq(playerSeasonStats.playerId, players.id))
		.innerJoin(teams, eq(playerSeasonStats.teamId, teams.id))
		.where(
			and(
				eq(playerSeasonStats.seasonId, seasonId),
				inArray(playerSeasonStats.playerId, playerIds),
			),
		);

interface PeerRow extends PeerStats {
	position: string;
}

// One batched query across every requested position, grouped client-side —
// not one query per position (the peer-group loop this replaced issued a
// sequential DB round-trip per distinct position).
export const fetchPeerGroupsByPosition = async (
	db: Db,
	seasonId: number,
	positions: Array<string>,
): Promise<Map<string, Array<PeerStats>>> => {
	const rows: Array<PeerRow> = await db
		.select({
			goalsPer90: playerSeasonStats.goalsPer90,
			assistsPer90: playerSeasonStats.assistsPer90,
			xgPer90: playerSeasonStats.xgPer90,
			position: players.position,
		})
		.from(playerSeasonStats)
		.innerJoin(players, eq(playerSeasonStats.playerId, players.id))
		.where(
			and(
				eq(playerSeasonStats.seasonId, seasonId),
				inArray(players.position, positions),
				gte(playerSeasonStats.minutesPlayed, MINIMUM_MINUTES_FOR_PEER_GROUP),
			),
		);

	const peersByPosition = new Map<string, Array<PeerStats>>();
	for (const position of positions) {
		peersByPosition.set(position, []);
	}
	for (const row of rows) {
		peersByPosition.get(row.position)?.push({
			goalsPer90: row.goalsPer90,
			assistsPer90: row.assistsPer90,
			xgPer90: row.xgPer90,
		});
	}
	return peersByPosition;
};
