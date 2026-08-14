import { playerSeasonStats, players, teams } from "@console-next/db/schema";
import type { OpenAPIHono } from "@hono/zod-openapi";
import { createRoute, z } from "@hono/zod-openapi";
import { and, eq, gte, inArray } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";

import { db } from "../db";
import type { PeerStats } from "./build-player-compare-entries";
import {
	buildCompareEntries,
	MINIMUM_MINUTES_FOR_PEER_GROUP,
	resolvePlayerRows,
} from "./build-player-compare-entries";

const PlayerCompareStatsSchema = z
	.object({
		minutesPlayed: z.number().int().nonnegative(),
		goals: z.number().int().nonnegative(),
		assists: z.number().int().nonnegative(),
		xg: z.number().nonnegative(),
		goalsPer90: z.number().nonnegative(),
		assistsPer90: z.number().nonnegative(),
		xgPer90: z.number().nonnegative(),
	})
	.openapi("PlayerCompareStats");

// Percentile: share of the (position + season) peer group, minutes-floor
// applied, that this player outperforms — null when the peer group is empty.
// The requested player's own row counts toward the peer group like anyone
// else's, even if that player themselves is below the minutes floor.
const PlayerComparePercentilesSchema = z
	.object({
		goalsPer90: z.number().min(0).max(100).nullable(),
		assistsPer90: z.number().min(0).max(100).nullable(),
		xgPer90: z.number().min(0).max(100).nullable(),
	})
	.openapi("PlayerComparePercentiles");

const PlayerCompareEntrySchema = z
	.object({
		playerId: z.number().int().positive(),
		name: z.string(),
		position: z.string(),
		team: z.string(),
		seasonId: z.number().int().positive(),
		stats: PlayerCompareStatsSchema,
		percentiles: PlayerComparePercentilesSchema,
		peerGroupSize: z.number().int().nonnegative(),
	})
	.openapi("PlayerCompareEntry");

const PlayerCompareResponseSchema = z
	.array(PlayerCompareEntrySchema)
	.openapi("PlayerCompareResponse");

const PlayerCompareQuerySchema = z.object({
	ids: z
		.string()
		.regex(
			/^\d+(,\d+)*$/,
			"ids must be a comma-separated list of positive integers",
		)
		.openapi({
			param: { name: "ids", in: "query" },
			example: "1,2,3",
		}),
	season: z
		.string()
		.regex(/^\d+$/, "season must be a positive integer")
		.openapi({
			param: { name: "season", in: "query" },
			example: "1",
		}),
});

export const playersCompareRoute = createRoute({
	method: "get",
	path: "/api/v1/players/compare",
	request: { query: PlayerCompareQuerySchema },
	responses: {
		200: {
			content: {
				"application/json": { schema: PlayerCompareResponseSchema },
			},
			description:
				"Player comparison data, percentile-ranked against positional peers",
		},
	},
});

export const registerPlayersCompareRoute = (app: OpenAPIHono): void => {
	app.openapi(playersCompareRoute, async (c) => {
		const { ids, season } = c.req.valid("query");
		const playerIds: Array<number> = ids.split(",").map(Number);
		const seasonId = Number(season);

		const requestedRows = await db
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

		const { rowByPlayerId, missingPlayerIds } = resolvePlayerRows(
			playerIds,
			requestedRows,
		);
		if (missingPlayerIds.length > 0) {
			throw new HTTPException(404, {
				message: `no stats found for season ${seasonId} for player id(s): ${missingPlayerIds.join(", ")}`,
			});
		}

		const positions = [
			...new Set([...rowByPlayerId.values()].map((row) => row.position)),
		];
		const peersByPosition = new Map<string, Array<PeerStats>>();
		for (const position of positions) {
			const peers = await db
				.select({
					goalsPer90: playerSeasonStats.goalsPer90,
					assistsPer90: playerSeasonStats.assistsPer90,
					xgPer90: playerSeasonStats.xgPer90,
				})
				.from(playerSeasonStats)
				.innerJoin(players, eq(playerSeasonStats.playerId, players.id))
				.where(
					and(
						eq(playerSeasonStats.seasonId, seasonId),
						eq(players.position, position),
						gte(
							playerSeasonStats.minutesPlayed,
							MINIMUM_MINUTES_FOR_PEER_GROUP,
						),
					),
				);
			peersByPosition.set(position, peers);
		}

		const entries = buildCompareEntries(
			playerIds,
			seasonId,
			rowByPlayerId,
			peersByPosition,
		);

		return c.json(entries);
	});
};
