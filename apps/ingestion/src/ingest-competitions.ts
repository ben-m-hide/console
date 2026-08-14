import type { Db } from "@console-next/db";
import { competitions } from "@console-next/db/schema";
import { sql } from "drizzle-orm";

import type { InsertableCompetition } from "./normalize-competition";
import { normalizeCompetition } from "./normalize-competition";
import { fetchLeagues } from "./sportmonks-client";

export interface IngestCompetitionsResult {
	fetched: number;
	upserted: number;
	failed: Array<{ id: number; name: string; error: string }>;
}

// A bad league shouldn't sink the whole run — same per-item failure
// isolation as the per-fixture transaction loop planned for match_events
// (PROJECT.md §3), applied here at league granularity.
export const ingestCompetitions = async (
	db: Db,
	token: string,
): Promise<IngestCompetitionsResult> => {
	const leagues = await fetchLeagues(token);

	const rows: Array<InsertableCompetition> = [];
	const failed: IngestCompetitionsResult["failed"] = [];

	for (const league of leagues) {
		try {
			rows.push(normalizeCompetition(league));
		} catch (error) {
			failed.push({
				id: league.id,
				name: league.name,
				error: error instanceof Error ? error.message : String(error),
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

	return { fetched: leagues.length, upserted: rows.length, failed };
};
