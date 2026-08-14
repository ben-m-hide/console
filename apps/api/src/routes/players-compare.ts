import { playerSeasonStats, players, teams } from "@console-next/db/schema";
import type { OpenAPIHono } from "@hono/zod-openapi";
import { createRoute, z } from "@hono/zod-openapi";
import { and, eq, gte, inArray } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";

import { db } from "../db";

// PROJECT.md §4's recommended default: same position, same competition
// (implied by seasonId — a season belongs to exactly one competition), same
// season, minimum 450 minutes played (~5 full matches) — small samples make
// percentiles meaningless.
const MINIMUM_MINUTES_FOR_PEER_GROUP = 450;

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

interface PeerStats {
	goalsPer90: number;
	assistsPer90: number;
	xgPer90: number;
}

const percentileOf = (
	value: number,
	peerValues: Array<number>,
): number | null =>
	peerValues.length > 0
		? (peerValues.filter((peerValue) => peerValue < value).length /
				peerValues.length) *
			100
		: null;

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

		// A mid-season transfer gives a player two rows for the same season (one
		// per team, per player_season_stats' own unique(playerId, teamId,
		// seasonId)) — compare against their stint with the most minutes.
		const rowByPlayerId = new Map<number, (typeof requestedRows)[number]>();
		for (const row of requestedRows) {
			const existing = rowByPlayerId.get(row.playerId);
			if (!existing || row.minutesPlayed > existing.minutesPlayed) {
				rowByPlayerId.set(row.playerId, row);
			}
		}

		const missingPlayerIds = playerIds.filter(
			(playerId) => !rowByPlayerId.has(playerId),
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

		const entries = playerIds.map((playerId) => {
			// biome-ignore lint/style/noNonNullAssertion: missingPlayerIds already threw above
			const row = rowByPlayerId.get(playerId)!;
			// biome-ignore lint/style/noNonNullAssertion: every row's position was collected into positions above
			const peers = peersByPosition.get(row.position)!;

			return {
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
		});

		return c.json(entries);
	});
};
