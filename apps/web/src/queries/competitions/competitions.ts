import { CompetitionSchema } from "@console-next/shared";
import { z } from "zod";

import { listQueryOptions } from "@/queries/common";

const CompetitionListResponseSchema = z.object({
	data: z.array(CompetitionSchema),
});

export const competitionsListQueryOptions = () =>
	listQueryOptions({
		path: "competitions",
		schema: CompetitionListResponseSchema,
	});
