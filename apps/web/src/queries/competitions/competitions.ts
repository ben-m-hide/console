import { CompetitionSchema, listResponseSchema } from "@console-next/shared";

import { listQueryOptions } from "@/queries/common";

const CompetitionListResponseSchema = listResponseSchema(CompetitionSchema);

export const competitionsListQueryOptions = () =>
	listQueryOptions({
		path: "competitions",
		schema: CompetitionListResponseSchema,
	});
