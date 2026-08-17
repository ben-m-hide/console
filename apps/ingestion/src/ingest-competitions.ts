import type { Db } from "@console-next/db";
import { competitions } from "@console-next/db/schema";
import { sql } from "drizzle-orm";

import type { IngestionFailure } from "./ingest-result";
import type { InsertableCompetition } from "./normalize-competition";
import { normalizeCompetition } from "./normalize-competition";
import { fetchLeagues } from "./sportmonks-client";
import { toErrorMessage } from "./to-error-message";

export interface IngestCompetitionsResult {
	fetched: number;
	upserted: number;
	failed: Array<IngestionFailure>;
}

// Per-item isolation: a bad league shouldn't sink the whole run.
export const ingestCompetitions = async (
	db: Db,
	token: string,
): Promise<IngestCompetitionsResult> => {
	const leagues = await fetchLeagues(token);

	const rows: Array<InsertableCompetition> = [];
	const failed: Array<IngestionFailure> = [];

	for (const league of leagues) {
		try {
			rows.push(normalizeCompetition(league));
		} catch (error) {
			failed.push({
				id: league.id,
				name: league.name,
				error: toErrorMessage(error),
			});
		}
	}

	if (rows.length > 0) {
		await db
			.insert(competitions)
			.values(rows)
			.onConflictDoUpdate({
				target: competitions.sportmonksId,
				set: {
					name: sql`excluded.name`,
					country: sql`excluded.country`,
				},
			});
	}

	const result: IngestCompetitionsResult = {
		fetched: leagues.length,
		upserted: rows.length,
		failed,
	};
	return result;
};
