import { competitions } from "@console-next/db/schema";
import { CompetitionSchema } from "@console-next/shared";
import { createRoute, type OpenAPIHono, z } from "@hono/zod-openapi";

import { db } from "../db";

const CompetitionListResponseSchema = z
	.object({ data: z.array(CompetitionSchema) })
	.openapi("CompetitionListResponse");

export const competitionsRoute = createRoute({
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

export const registerCompetitionsRoute = (app: OpenAPIHono): void => {
	app.openapi(competitionsRoute, async (c) => {
		const rows = await db.select().from(competitions);
		return c.json({ data: rows });
	});
};
