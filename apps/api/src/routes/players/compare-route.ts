import { createRoute, type OpenAPIHono, z } from "@hono/zod-openapi";
import { HTTPException } from "hono/http-exception";

import { db } from "../../db";
import {
	POSITIVE_INTEGER_PATTERN,
	positiveIntegerParamMessage,
} from "../../lib/positive-integer-param";
import { buildCompareEntries, resolvePlayerRows } from "./compare-entries";
import { fetchPeerGroupsByPosition, fetchRequestedRows } from "./compare-fetch";
import { parseCompareQuery } from "./compare-query";

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

// See percentileOf in compare-entries.ts for the exact semantics.
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
		.regex(POSITIVE_INTEGER_PATTERN, positiveIntegerParamMessage("season"))
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
		const { playerIds, seasonId } = parseCompareQuery(ids, season);

		const requestedRows = await fetchRequestedRows(db, seasonId, playerIds);

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
		const peersByPosition = await fetchPeerGroupsByPosition(
			db,
			seasonId,
			positions,
		);

		const entries = buildCompareEntries(
			playerIds,
			seasonId,
			rowByPlayerId,
			peersByPosition,
		);

		return c.json(entries);
	});
};
