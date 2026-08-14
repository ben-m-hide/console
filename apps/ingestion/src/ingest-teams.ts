import type { Db } from "@console-next/db";
import { teams } from "@console-next/db/schema";
import { sql } from "drizzle-orm";

import type { IngestionFailure } from "./ingest-result";
import type { InsertableTeam } from "./normalize-team";
import { normalizeTeam } from "./normalize-team";
import type { SportmonksFixtureRaw } from "./sportmonks-types";
import { toErrorMessage } from "./to-error-message";

export interface IngestTeamsResult {
	fetched: number;
	upserted: number;
	failed: Array<IngestionFailure>;
}

// Teams have no dedicated fetch of their own — every fixture's `participants`
// include already carries full team objects (sportmonks-client.ts's
// fetchSeasonFixtures), so this derives teams from fixtures already fetched
// for ingestFixtures rather than issuing a second Sportmonks request.
export const ingestTeams = async (
	db: Db,
	rawFixtures: Array<SportmonksFixtureRaw>,
): Promise<IngestTeamsResult> => {
	const rawTeamsById = new Map(
		rawFixtures
			.flatMap((fixture) => fixture.participants)
			.map((participant) => [participant.id, participant]),
	);
	const rawTeams = [...rawTeamsById.values()];

	const rows: Array<InsertableTeam> = [];
	const failed: IngestTeamsResult["failed"] = [];

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
