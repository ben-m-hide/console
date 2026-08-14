import { PlayerSchema } from "@console-next/shared";

import type { SportmonksPlayerRaw } from "./sportmonks-types";

// id is DB-generated (identity column) — see normalize-competition.ts for the
// same reasoning.
const InsertablePlayerSchema = PlayerSchema.omit({ id: true });

export type InsertablePlayer = ReturnType<typeof InsertablePlayerSchema.parse>;

export const normalizePlayer = (raw: SportmonksPlayerRaw): InsertablePlayer => {
	if (!raw.nationality) {
		throw new Error(
			`player ${raw.id} (${raw.name}) has no nationality — was include=nationality omitted from the request?`,
		);
	}
	if (!raw.position) {
		throw new Error(
			`player ${raw.id} (${raw.name}) has no position — was include=position omitted from the request?`,
		);
	}

	return InsertablePlayerSchema.parse({
		sportmonksId: raw.id,
		name: raw.name,
		dateOfBirth: raw.date_of_birth,
		nationality: raw.nationality.name,
		position: raw.position.name,
	});
};
