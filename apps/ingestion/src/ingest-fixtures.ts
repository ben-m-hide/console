import { type Db } from "@console-next/db";
import { fixtures, seasons, teams } from "@console-next/db/schema";
import { sql } from "drizzle-orm";

import { type IngestionFailure } from "./ingest-result";
import { type InsertableFixture, normalizeFixture } from "./normalize-fixture";
import { type SportmonksFixtureRaw } from "./sportmonks-types";
import { toErrorMessage } from "./to-error-message";

export interface IngestFixturesResult {
	fetched: number;
	upserted: number;
	failed: Array<IngestionFailure>;
}

// seasonId/homeTeamId/awayTeamId FKs resolved via already-ingested parents'
// sportmonksId, same pattern as ingest-seasons.ts's competitionId.
export const ingestFixtures = async (
	db: Db,
	rawFixtures: Array<SportmonksFixtureRaw>,
): Promise<IngestFixturesResult> => {
	const ingestedSeasons = await db
		.select({ id: seasons.id, sportmonksId: seasons.sportmonksId })
		.from(seasons);
	const seasonIdBySportmonksId = new Map(
		ingestedSeasons.map((season) => [season.sportmonksId, season.id]),
	);

	const ingestedTeams = await db
		.select({ id: teams.id, sportmonksId: teams.sportmonksId })
		.from(teams);
	const teamIdBySportmonksId = new Map(
		ingestedTeams.map((team) => [team.sportmonksId, team.id]),
	);

	const rows: Array<InsertableFixture> = [];
	const failed: Array<IngestionFailure> = [];

	for (const rawFixture of rawFixtures) {
		try {
			rows.push(
				normalizeFixture(
					rawFixture,
					seasonIdBySportmonksId,
					teamIdBySportmonksId,
				),
			);
		} catch (error) {
			failed.push({
				id: rawFixture.id,
				name: rawFixture.name,
				error: toErrorMessage(error),
			});
		}
	}

	if (rows.length > 0) {
		// Drizzle's timestamptz insert type wants a Date, not the ISO string
		// FixtureSchema validates — unlike seasons' date() columns.
		const insertableRows = rows.map((row) => ({
			...row,
			kickoffAt: new Date(row.kickoffAt),
		}));

		await db
			.insert(fixtures)
			.values(insertableRows)
			.onConflictDoUpdate({
				target: fixtures.sportmonksId,
				set: {
					seasonId: sql`excluded.season_id`,
					homeTeamId: sql`excluded.home_team_id`,
					awayTeamId: sql`excluded.away_team_id`,
					kickoffAt: sql`excluded.kickoff_at`,
					status: sql`excluded.status`,
					homeScore: sql`excluded.home_score`,
					awayScore: sql`excluded.away_score`,
				},
			});
	}

	const result: IngestFixturesResult = {
		fetched: rawFixtures.length,
		upserted: rows.length,
		failed,
	};
	return result;
};
