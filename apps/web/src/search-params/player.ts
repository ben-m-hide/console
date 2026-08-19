import { z } from "zod";

import { PlayerField, PlayerPosition } from "@/types";

import { createSortableSearchSchema, ListSearchSchema } from "./search";

export const PlayersSearchSchema = ListSearchSchema.extend({
	position: z.enum(PlayerPosition).optional().catch(undefined),
	...createSortableSearchSchema(PlayerField),
});

export type PlayersSearchParams = z.infer<typeof PlayersSearchSchema>;
