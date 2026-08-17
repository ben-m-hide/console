import type { Db } from "@console-next/db";
import { teams } from "@console-next/db/schema";
import { sql } from "drizzle-orm";

import type { IngestionFailure } from "./ingest-result";
import type { InsertableTeam } from "./normalize-team";
import { normalizeTeam } from "./normalize-team";
import type { SportmonksTeamRaw } from "./sportmonks-types";
import { toErrorMessage } from "./to-error-message";

export interface IngestTeamsResult {
	fetched: number;
	upserted: number;
	failed: Array<IngestionFailure>;
}

// Teams have no single dedicated fetch — callers source raw teams from
// wherever's cheapest (see this package's CLAUDE.md). Deduped here by
// sportmonksId so callers can pass overlapping lists without worrying about it.
export const ingestTeams = async (
	db: Db,
	rawTeamsInput: Array<SportmonksTeamRaw>,
): Promise<IngestTeamsResult> => {
	const rawTeamsById = new Map(
		rawTeamsInput.map((rawTeam) => [rawTeam.id, rawTeam]),
	);
	const rawTeams = [...rawTeamsById.values()];

	const rows: Array<InsertableTeam> = [];
	const failed: Array<IngestionFailure> = [];

	for (const rawTeam of rawTeams) {
		try {
			rows.push(normalizeTeam(rawTeam));
		} catch (error) {
			failed.push({
				id: rawTeam.id,
				name: rawTeam.name,
				error: toErrorMessage(error),
			});
		}
	}

	if (rows.length > 0) {
		await db
			.insert(teams)
			.values(rows)
			.onConflictDoUpdate({
				target: teams.sportmonksId,
				set: {
					name: sql`excluded.name`,
					shortName: sql`excluded.short_name`,
					logoUrl: sql`excluded.logo_url`,
				},
			});
	}

	const result: IngestTeamsResult = {
		fetched: rawTeams.length,
		upserted: rows.length,
		failed,
	};
	return result;
};
