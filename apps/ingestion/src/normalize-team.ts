import { TeamSchema } from "@console-next/shared";

import type { SportmonksTeamRaw } from "./sportmonks-types";

// id is DB-generated (identity column) — see normalize-competition.ts for the
// same reasoning.
const InsertableTeamSchema = TeamSchema.omit({ id: true });

export type InsertableTeam = ReturnType<typeof InsertableTeamSchema.parse>;

export const normalizeTeam = (raw: SportmonksTeamRaw): InsertableTeam => {
	if (!raw.short_code) {
		throw new Error(`team ${raw.id} (${raw.name}) has no short_code`);
	}

	return InsertableTeamSchema.parse({
		sportmonksId: raw.id,
		name: raw.name,
		shortName: raw.short_code,
		logoUrl: raw.image_path ?? null,
	});
};
