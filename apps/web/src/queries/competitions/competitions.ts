import { CompetitionSchema } from "@console-next/shared";
import { z } from "zod";

import { listQueryOptions } from "@/queries";

const CompetitionListResponseSchema = z.object({
	data: z.array(CompetitionSchema),
});

export const competitionsListQueryOptions = () =>
	listQueryOptions({
		path: "competitions",
		schema: CompetitionListResponseSchema,
	});
