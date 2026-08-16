import { players } from "@console-next/db/schema";
import { PlayerSchema } from "@console-next/shared";
import type { OpenAPIHono } from "@hono/zod-openapi";
import { createRoute, z } from "@hono/zod-openapi";
import type { SQL } from "drizzle-orm";
import { and, asc, count, eq, ilike } from "drizzle-orm";

import { db } from "../db";
import {
	buildPageMeta,
	DEFAULT_PAGE_SIZE,
	MAX_PAGE_SIZE,
	resolvePagination,
} from "./build-players-query";

const PlayerPageMetaSchema = z
	.object({
		page: z.number().int().positive(),
		pageSize: z.number().int().positive(),
		total: z.number().int().nonnegative(),
		totalPages: z.number().int().nonnegative(),
	})
	.openapi("PlayerPageMeta");

// Envelope rather than a bare array, unlike /competitions: a paginated list is
// unusable without `total`, since the client cannot render pagination without
// knowing how many pages exist. See PROJECT.md §4 for which shape applies when.
const PlayerListResponseSchema = z
	.object({
		data: z.array(PlayerSchema),
		meta: PlayerPageMetaSchema,
	})
	.openapi("PlayerListResponse");

const PlayerListQuerySchema = z.object({
	search: z
		.string()
		.min(1)
		.optional()
		.openapi({
			param: { name: "search", in: "query" },
			example: "Saka",
		}),
	position: z
		.string()
		.min(1)
		.optional()
		.openapi({
			param: { name: "position", in: "query" },
			example: "Midfielder",
		}),
	// Plain optional strings, parsed in resolvePagination rather than by Zod.
	// z.coerce.number().catch() cannot be introspected by the OpenAPI
	// generator: it returns a 500 for /doc, which leaves Scalar rendering an
	// empty reference page. Parsing in code also makes the lenient-fallback
	// behaviour unit-testable.
	page: z
		.string()
		.optional()
		.openapi({
			param: { name: "page", in: "query" },
			example: "1",
		}),
	pageSize: z
		.string()
		.optional()
		.openapi({
			param: { name: "pageSize", in: "query" },
			example: String(DEFAULT_PAGE_SIZE),
		}),
});

export const playersRoute = createRoute({
	method: "get",
	path: "/api/v1/players",
	request: { query: PlayerListQuerySchema },
	responses: {
		200: {
			content: {
				"application/json": { schema: PlayerListResponseSchema },
			},
			description: `Paginated player list. pageSize is capped at ${MAX_PAGE_SIZE}.`,
		},
	},
});

export const registerPlayersRoute = (app: OpenAPIHono): void => {
	app.openapi(playersRoute, async (c) => {
		const { search, position, page, pageSize } = c.req.valid("query");
		const pagination = resolvePagination(page, pageSize);

		const filters: Array<SQL> = [];
		if (search !== undefined) {
			filters.push(ilike(players.name, `%${search}%`));
		}
		if (position !== undefined) {
			filters.push(eq(players.position, position));
		}
		const where = filters.length > 0 ? and(...filters) : undefined;

		const rows = await db
			.select()
			.from(players)
			.where(where)
			// name alone is not a total order — without the id tiebreak, rows can
			// shift between pages and the client sees duplicates and gaps.
			.orderBy(asc(players.name), asc(players.id))
			.limit(pagination.pageSize)
			.offset(pagination.offset);

		const [totalRow] = await db
			.select({ value: count() })
			.from(players)
			.where(where);

		return c.json({
			data: rows,
			meta: buildPageMeta(pagination, totalRow?.value ?? 0),
		});
	});
};
