import type { Db } from "@console-next/db";
import { competitions, seasons } from "@console-next/db/schema";
import { sql } from "drizzle-orm";

import type { InsertableSeason } from "./normalize-season";
import { normalizeSeason } from "./normalize-season";
import { fetchSeasons } from "./sportmonks-client";

export interface IngestSeasonsResult {
	fetched: number;
	upserted: number;
	failed: Array<{ id: number; name: string; error: string }>;
}

// Depends on competitions already being ingested — seasons.competitionId is
// an FK, resolved here via each competition's own sportmonksId rather than
// re-fetching leagues from Sportmonks again.
export const ingestSeasons = async (
	db: Db,
	token: string,
): Promise<IngestSeasonsResult> => {
	const ingestedCompetitions = await db
		.select({ id: competitions.id, sportmonksId: competitions.sportmonksId })
		.from(competitions);

	if (ingestedCompetitions.length === 0) {
		return { fetched: 0, upserted: 0, failed: [] };
	}

	const competitionIdByLeagueId = new Map(
		ingestedCompetitions.map((c) => [c.sportmonksId, c.id]),
	);
	const leagueIds = ingestedCompetitions.map((c) => c.sportmonksId);

	const rawSeasons = await fetchSeasons(token, leagueIds);

	const rows: Array<InsertableSeason> = [];
	const failed: IngestSeasonsResult["failed"] = [];

	for (const rawSeason of rawSeasons) {
		try {
			rows.push(normalizeSeason(rawSeason, competitionIdByLeagueId));
		} catch (error) {
			failed.push({
				id: rawSeason.id,
				name: rawSeason.name,
				error: error instanceof Error ? error.message : String(error),
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

	return { fetched: rawSeasons.length, upserted: rows.length, failed };
};
