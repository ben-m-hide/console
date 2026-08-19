import { seasons } from "@console-next/db/schema";
import { SeasonSchema } from "@console-next/shared";
import { createRoute, type OpenAPIHono, z } from "@hono/zod-openapi";
import { asc, desc, eq } from "drizzle-orm";

import { db } from "../db";

// Envelope, not paginated — every list endpoint returns { data }, whether
// or not it paginates. See PROJECT.md §4.
const SeasonListResponseSchema = z
	.object({ data: z.array(SeasonSchema) })
	.openapi("SeasonListResponse");

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

		return c.json({ data: rows });
	});
};
