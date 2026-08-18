import { z } from "zod";

import { ListSearchSchema } from "@/routing/search";
import { PlayerPosition } from "@/types";

export const PlayersSearchSchema = ListSearchSchema.extend({
	position: z.enum(PlayerPosition).optional().catch(undefined),
});

export type PlayersSearchParams = z.infer<typeof PlayersSearchSchema>;
