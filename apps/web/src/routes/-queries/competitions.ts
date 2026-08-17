import type { Competition } from "@console-next/shared";
import { CompetitionSchema } from "@console-next/shared";
import { queryOptions } from "@tanstack/react-query";

import { get } from "@/lib/api/api-client";

const fetchCompetitions = async (
	signal: AbortSignal,
): Promise<Array<Competition>> => {
	const body = await get({ path: "/api/v1/competitions", signal });

	const parsed = CompetitionSchema.array().safeParse(body);
	if (!parsed.success) {
		throw new Error("Response did not match the expected schema");
	}
	return parsed.data;
};

// Hierarchical key (["competitions", "list"]) so a future detail query can
// invalidate siblings without matching everything.
export const competitionsQueryOptions = queryOptions({
	queryKey: ["competitions", "list"],
	queryFn: ({ signal }) => fetchCompetitions(signal),
});
