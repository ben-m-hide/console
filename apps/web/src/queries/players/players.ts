import {
	PlayerSchema,
	paginatedListResponseSchema,
} from "@console-next/shared";

import { listQueryOptions } from "@/queries/common";
import { type PlayersSearchParams } from "@/search-params";

const PlayerListResponseSchema = paginatedListResponseSchema(PlayerSchema);

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
