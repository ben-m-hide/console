import { players } from "@console-next/db/schema";
import { PlayerSchema } from "@console-next/shared";
import { createRoute, type OpenAPIHono, z } from "@hono/zod-openapi";
import { and, asc, count, eq, ilike, type SQL } from "drizzle-orm";

import { db } from "../db";
import {
	buildPageMeta,
	DEFAULT_PAGE_SIZE,
	MAX_PAGE_SIZE,
	resolvePagination,
	resolveSort,
} from "./build-players-query";

const PlayerPageMetaSchema = z
	.object({
		page: z.number().int().positive(),
		pageSize: z.number().int().positive(),
		total: z.number().int().nonnegative(),
		totalPages: z.number().int().nonnegative(),
	})
	.openapi("PlayerPageMeta");

// Envelope with pagination meta — every list endpoint returns { data }, but
// this one also needs `total` for pagination. See PROJECT.md §4.
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
	// Plain optional strings — see parsePositiveInteger in build-players-query.ts
	// for why not z.coerce.number().catch().
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
	sort: z
		.string()
		.min(1)
		.optional()
		.openapi({
			param: { name: "sort", in: "query" },
			example: "name",
		}),
	order: z
		.string()
		.min(1)
		.optional()
		.openapi({
			param: { name: "order", in: "query" },
			example: "asc",
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
			description: `Paginated, sortable player list. pageSize is capped at ${MAX_PAGE_SIZE}. sort defaults to name; unrecognized values fall back to it.`,
		},
	},
});

export const registerPlayersRoute = (app: OpenAPIHono): void => {
	app.openapi(playersRoute, async (c) => {
		const { search, position, page, pageSize, sort, order } =
			c.req.valid("query");
		const pagination = resolvePagination(page, pageSize);
		const { column, orderBy } = resolveSort(sort, order);

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
			// id tiebreak is a total order regardless of the requested sort column
			// — without it, rows can shift between pages and the client sees
			// duplicates and gaps.
			.orderBy(orderBy(column), asc(players.id))
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
