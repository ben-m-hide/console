import { type Db } from "@console-next/db";
import { players } from "@console-next/db/schema";
import { sql } from "drizzle-orm";

import { type IngestionFailure } from "./ingest-result";
import { type InsertablePlayer, normalizePlayer } from "./normalize-player";
import { type SportmonksPlayerRaw } from "./sportmonks-types";
import { toErrorMessage } from "./to-error-message";

export interface IngestPlayersResult {
	fetched: number;
	upserted: number;
	failed: Array<IngestionFailure>;
}

export const ingestPlayers = async (
	db: Db,
	rawPlayers: Array<SportmonksPlayerRaw>,
): Promise<IngestPlayersResult> => {
	const rows: Array<InsertablePlayer> = [];
	const failed: Array<IngestionFailure> = [];

	for (const rawPlayer of rawPlayers) {
		try {
			rows.push(normalizePlayer(rawPlayer));
		} catch (error) {
			failed.push({
				id: rawPlayer.id,
				name: rawPlayer.name,
				error: toErrorMessage(error),
			});
		}
	}

	if (rows.length > 0) {
		await db
			.insert(players)
			.values(rows)
			.onConflictDoUpdate({
				target: players.sportmonksId,
				set: {
					name: sql`excluded.name`,
					dateOfBirth: sql`excluded.date_of_birth`,
					nationality: sql`excluded.nationality`,
					position: sql`excluded.position`,
				},
			});
	}

	const result: IngestPlayersResult = {
		fetched: rawPlayers.length,
		upserted: rows.length,
		failed,
	};
	return result;
};
