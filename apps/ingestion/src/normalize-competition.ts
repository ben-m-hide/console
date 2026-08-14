import { CompetitionSchema } from "@console-next/shared";

import type { SportmonksLeagueRaw } from "./sportmonks-types";

// id is DB-generated (identity column) — omit it from the shape we validate
// and insert. CompetitionSchema itself always requires it (it validates full
// rows, e.g. API responses), so this is the insert-time subset of it.
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
