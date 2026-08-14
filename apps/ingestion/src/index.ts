import { createDb } from "@console-next/db";
import { seasons } from "@console-next/db/schema";
import { eq } from "drizzle-orm";

import { ingestCompetitions } from "./ingest-competitions";
import { ingestFixtures } from "./ingest-fixtures";
import { ingestSeasons } from "./ingest-seasons";
import { ingestTeams } from "./ingest-teams";
import { fetchSeasonFixtures } from "./sportmonks-client";
import type { SportmonksFixtureRaw } from "./sportmonks-types";

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

// Fixtures/teams are scoped to each competition's current season only —
// deliberately not a full historical backfill yet (see TODO.md).
const currentSeasons = await db
	.select({ sportmonksId: seasons.sportmonksId })
	.from(seasons)
	.where(eq(seasons.isCurrent, true));

const rawFixtures: Array<SportmonksFixtureRaw> = [];
for (const season of currentSeasons) {
	const seasonFixtures = await fetchSeasonFixtures(
		sportmonksToken,
		season.sportmonksId,
	);
	rawFixtures.push(...seasonFixtures);
}

// Teams depend on nothing but the fixtures already fetched above; fixtures
// depend on teams being ingested first (homeTeamId/awayTeamId FKs) — same
// sequential-not-parallel discipline as competitions before seasons.
const teamsResult = await ingestTeams(db, rawFixtures);
console.log(
	`ingested teams: fetched ${teamsResult.fetched}, upserted ${teamsResult.upserted}, failed ${teamsResult.failed.length}`,
);
if (teamsResult.failed.length > 0) {
	console.log("team failures:", teamsResult.failed);
}

const fixturesResult = await ingestFixtures(db, rawFixtures);
console.log(
	`ingested fixtures: fetched ${fixturesResult.fetched}, upserted ${fixturesResult.upserted}, failed ${fixturesResult.failed.length}`,
);
if (fixturesResult.failed.length > 0) {
	console.log("fixture failures:", fixturesResult.failed);
}

await db.$client.end();
