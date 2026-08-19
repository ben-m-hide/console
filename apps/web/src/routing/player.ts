import { z } from "zod";

import { createSortableSearchSchema, ListSearchSchema } from "@/routing/search";
import { PlayerField, PlayerPosition } from "@/types";

export const PlayersSearchSchema = ListSearchSchema.extend({
	position: z.enum(PlayerPosition).optional().catch(undefined),
	...createSortableSearchSchema(PlayerField),
});

export type PlayersSearchParams = z.infer<typeof PlayersSearchSchema>;
