import { seasons } from "@console-next/db/schema";
import { SeasonSchema } from "@console-next/shared";
import type { OpenAPIHono } from "@hono/zod-openapi";
import { createRoute, z } from "@hono/zod-openapi";
import { asc, desc, eq } from "drizzle-orm";

import { db } from "../db";

// Bare array, not the paginated envelope /players uses: the season count is
// small and bounded (one row per competition-season), so paginating it would
// add a shape the client has to handle for no benefit.
const SeasonListResponseSchema = z.array(SeasonSchema).openapi("SeasonList");

const SeasonListQuerySchema = z.object({
	competition: z
		.string()
		.regex(/^\d+$/, "competition must be a positive integer")
		.optional()
		.openapi({
			param: { name: "competition", in: "query" },
			example: "1",
		}),
});

export const seasonsRoute = createRoute({
	method: "get",
	path: "/api/v1/seasons",
	request: { query: SeasonListQuerySchema },
	responses: {
		200: {
			content: {
				"application/json": { schema: SeasonListResponseSchema },
			},
			description:
				"Seasons, newest first, optionally filtered to one competition",
		},
	},
});

export const registerSeasonsRoute = (app: OpenAPIHono): void => {
	app.openapi(seasonsRoute, async (c) => {
		const { competition } = c.req.valid("query");
		const where =
			competition === undefined
				? undefined
				: eq(seasons.competitionId, Number(competition));

		const rows = await db
			.select()
			.from(seasons)
			.where(where)
			.orderBy(asc(seasons.competitionId), desc(seasons.startDate));

		return c.json(rows);
	});
};
