import { CompetitionSchema } from "@console-next/shared";

import type { SportmonksLeagueRaw } from "./sportmonks-types";

// id is DB-generated — CompetitionSchema requires it for full rows (API
// responses), so this is the insert-time subset without it.
const InsertableCompetitionSchema = CompetitionSchema.omit({ id: true });

export type InsertableCompetition = ReturnType<
	typeof InsertableCompetitionSchema.parse
>;

export const normalizeCompetition = (
	raw: SportmonksLeagueRaw,
): InsertableCompetition => {
	if (!raw.country) {
		throw new Error(
			`league ${raw.id} (${raw.name}) has no country — was include=country omitted from the request?`,
		);
	}

	return InsertableCompetitionSchema.parse({
		sportmonksId: raw.id,
		name: raw.name,
		country: raw.country.name,
	});
};
