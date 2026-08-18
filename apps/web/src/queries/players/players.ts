import { PlayerSchema } from "@console-next/shared";
import { z } from "zod";

import { listQueryOptions } from "@/queries/common/query-options";
import type { PlayersSearchParams } from "@/routing/player";
import { ListMetaSchema } from "@/routing/search";

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
		},
		schema: PlayerListResponseSchema,
	});
