import type { Db } from "@console-next/db";
import { fixtures, seasons, teams } from "@console-next/db/schema";
import { sql } from "drizzle-orm";

import type { IngestionFailure } from "./ingest-result";
import type { InsertableFixture } from "./normalize-fixture";
import { normalizeFixture } from "./normalize-fixture";
import type { SportmonksFixtureRaw } from "./sportmonks-types";
import { toErrorMessage } from "./to-error-message";

export interface IngestFixturesResult {
	fetched: number;
	upserted: number;
	failed: Array<IngestionFailure>;
}

// Depends on seasons and teams already being ingested — fixtures.seasonId,
// homeTeamId, and awayTeamId are all FKs, resolved here via each parent's own
// sportmonksId rather than re-fetching from Sportmonks again (same pattern as
// ingest-seasons.ts's competitionId resolution).
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
		// kickoffAt is validated as an ISO string (FixtureSchema, matching the
		// JSON-API-facing shape) but Drizzle's timestamptz column insert type
		// wants a Date, not a string — unlike seasons' date() columns, which
		// accept a plain string directly.
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
