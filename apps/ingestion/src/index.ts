import { createDb } from "@console-next/db";

import { ingestCompetitions } from "./ingest-competitions";
import { ingestSeasons } from "./ingest-seasons";

const databaseUrl = process.env.DATABASE_URL;
const sportmonksToken = process.env.SPORTMONKS_TOKEN;

if (!databaseUrl) {
	throw new Error("DATABASE_URL is not set");
}
if (!sportmonksToken) {
	throw new Error("SPORTMONKS_TOKEN is not set");
}

const db = createDb(databaseUrl);

// Seasons depend on competitions already being ingested (FK resolution via
// each competition's sportmonksId) — sequential, not parallel.
const competitionsResult = await ingestCompetitions(db, sportmonksToken);
console.log(
	`ingested competitions: fetched ${competitionsResult.fetched}, upserted ${competitionsResult.upserted}, failed ${competitionsResult.failed.length}`,
);
if (competitionsResult.failed.length > 0) {
	console.log("competition failures:", competitionsResult.failed);
}

const seasonsResult = await ingestSeasons(db, sportmonksToken);
console.log(
	`ingested seasons: fetched ${seasonsResult.fetched}, upserted ${seasonsResult.upserted}, failed ${seasonsResult.failed.length}`,
);
if (seasonsResult.failed.length > 0) {
	console.log("season failures:", seasonsResult.failed);
}

await db.$client.end();
