import { createDb } from "@console-next/db";

import { ingestCompetitions } from "./ingest-competitions";

const databaseUrl = process.env.DATABASE_URL;
const sportmonksToken = process.env.SPORTMONKS_TOKEN;

if (!databaseUrl) {
	throw new Error("DATABASE_URL is not set");
}
if (!sportmonksToken) {
	throw new Error("SPORTMONKS_TOKEN is not set");
}

const db = createDb(databaseUrl);
const result = await ingestCompetitions(db, sportmonksToken);

console.log(
	`ingested competitions: fetched ${result.fetched}, upserted ${result.upserted}, failed ${result.failed.length}`,
);
if (result.failed.length > 0) {
	console.log("failures:", result.failed);
}

await db.$client.end();
