import { competitions } from "@console-next/db/schema";
import { CompetitionSchema, listResponseSchema } from "@console-next/shared";
import { createRoute, type OpenAPIHono } from "@hono/zod-openapi";

import { db } from "../../db";

const CompetitionListResponseSchema = listResponseSchema(
	CompetitionSchema,
).openapi("CompetitionListResponse");

export const competitionsListRoute = createRoute({
	method: "get",
	path: "/api/v1/competitions",
	responses: {
		200: {
			content: {
				"application/json": { schema: CompetitionListResponseSchema },
			},
			description: "List of available competitions",
		},
	},
});

export const registerCompetitionsListRoute = (app: OpenAPIHono): void => {
	app.openapi(competitionsListRoute, async (c) => {
		const rows = await db.select().from(competitions);
		return c.json({ data: rows });
	});
};
