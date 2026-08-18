import { PlayerSchema } from "@console-next/shared";
import { z } from "zod";

import { listQueryOptions } from "@/queries";
import type { PlayersSearchParams } from "@/routing";
import { ListMetaSchema } from "@/routing";

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
