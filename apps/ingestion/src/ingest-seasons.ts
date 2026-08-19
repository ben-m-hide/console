import { type Db } from "@console-next/db";
import { competitions, seasons } from "@console-next/db/schema";
import { sql } from "drizzle-orm";

import { type IngestionFailure } from "./ingest-result";
import { type InsertableSeason, normalizeSeason } from "./normalize-season";
import { fetchSeasons } from "./sportmonks-client";
import { toErrorMessage } from "./to-error-message";

export interface IngestSeasonsResult {
	fetched: number;
	upserted: number;
	failed: Array<IngestionFailure>;
}

// competitionId FK resolved via already-ingested competitions' sportmonksId,
// not by re-fetching leagues.
export const ingestSeasons = async (
	db: Db,
	token: string,
): Promise<IngestSeasonsResult> => {
	const ingestedCompetitions = await db
		.select({ id: competitions.id, sportmonksId: competitions.sportmonksId })
		.from(competitions);

	if (ingestedCompetitions.length === 0) {
		const emptyResult: IngestSeasonsResult = {
			fetched: 0,
			upserted: 0,
			failed: [],
		};
		return emptyResult;
	}

	const competitionIdByLeagueId = new Map(
		ingestedCompetitions.map((competition) => [
			competition.sportmonksId,
			competition.id,
		]),
	);
	const leagueIds = ingestedCompetitions.map(
		(competition) => competition.sportmonksId,
	);

	const rawSeasons = await fetchSeasons(token, leagueIds);

	const rows: Array<InsertableSeason> = [];
	const failed: Array<IngestionFailure> = [];

	for (const rawSeason of rawSeasons) {
		try {
			rows.push(normalizeSeason(rawSeason, competitionIdByLeagueId));
		} catch (error) {
			failed.push({
				id: rawSeason.id,
				name: rawSeason.name,
				error: toErrorMessage(error),
			});
		}
	}

	if (rows.length > 0) {
		await db
			.insert(seasons)
			.values(rows)
			.onConflictDoUpdate({
				target: seasons.sportmonksId,
				set: {
					competitionId: sql`excluded.competition_id`,
					name: sql`excluded.name`,
					startDate: sql`excluded.start_date`,
					endDate: sql`excluded.end_date`,
					isCurrent: sql`excluded.is_current`,
				},
			});
	}

	const result: IngestSeasonsResult = {
		fetched: rawSeasons.length,
		upserted: rows.length,
		failed,
	};
	return result;
};
