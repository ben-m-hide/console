import type { Competition } from "@console-next/shared";
import { CompetitionSchema } from "@console-next/shared";
import { queryOptions } from "@tanstack/react-query";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4100";

const fetchCompetitions = async (
	signal: AbortSignal,
): Promise<Array<Competition>> => {
	const response = await fetch(`${API_URL}/api/v1/competitions`, { signal });
	if (!response.ok) {
		throw new Error(`Request failed: ${response.status}`);
	}

	const parsed = CompetitionSchema.array().safeParse(await response.json());
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
