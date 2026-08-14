import { SeasonSchema } from "@console-next/shared";

import type { SportmonksSeasonRaw } from "./sportmonks-types";

// id is DB-generated (identity column) — see normalize-competition.ts for the
// same reasoning.
const InsertableSeasonSchema = SeasonSchema.omit({ id: true });

export type InsertableSeason = ReturnType<typeof InsertableSeasonSchema.parse>;

export const normalizeSeason = (
	raw: SportmonksSeasonRaw,
	competitionIdByLeagueId: Map<number, number>,
): InsertableSeason => {
	const competitionId = competitionIdByLeagueId.get(raw.league_id);
	if (competitionId === undefined) {
		throw new Error(
			`season ${raw.id} (${raw.name}) references league_id ${raw.league_id}, which has no matching ingested competition`,
		);
	}

	return InsertableSeasonSchema.parse({
		sportmonksId: raw.id,
		competitionId,
		name: raw.name,
		startDate: raw.starting_at,
		endDate: raw.ending_at,
		isCurrent: raw.is_current,
	});
};
