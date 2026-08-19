import { PlayerSchema } from "@console-next/shared";
import { z } from "zod";

import { listQueryOptions } from "@/queries/common";
import { ListMetaSchema, type PlayersSearchParams } from "@/search-params";

const PlayerListResponseSchema = z.object({
	data: z.array(PlayerSchema),
	meta: ListMetaSchema,
});

export const playersListQueryOptions = (params: PlayersSearchParams) =>
	listQueryOptions({
		path: "players",
		queryParams: {
			page: params.page,
			pageSize: params.pageSize,
			search: params.search,
			position: params.position,
			sort: params.sort,
			order: params.sortDirection,
		},
		schema: PlayerListResponseSchema,
	});
