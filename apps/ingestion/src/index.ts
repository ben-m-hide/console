import { createDb } from "@console-next/db";
import { competitions, seasons } from "@console-next/db/schema";
import { and, desc, eq } from "drizzle-orm";

import { ingestCompetitions } from "./ingest-competitions";
import { ingestFixtures } from "./ingest-fixtures";
import { ingestPlayerSeasonStats } from "./ingest-player-season-stats";
import { ingestPlayers } from "./ingest-players";
import { ingestSeasons } from "./ingest-seasons";
import { ingestTeams } from "./ingest-teams";
import {
	fetchPlayerWithStats,
	fetchSeasonFixtures,
	fetchSeasonTeams,
	fetchTeamSquad,
} from "./sportmonks-client";
import type {
	SportmonksFixtureRaw,
	SportmonksPlayerRaw,
} from "./sportmonks-types";

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
const currentSeasonTeams = rawFixtures.flatMap(
	(fixture) => fixture.participants,
);
const teamsResult = await ingestTeams(db, currentSeasonTeams);
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

// Players/stats: Premier League only, most-recently-*finished* season — not
// "current" (2026/2027 hasn't kicked off, so it has ~zero real minutes
// played) and not every competition yet (real request volume here is ~500
// per competition — one team's squad list, then one profile+stats request
// per player — proving this on one competition first, same discipline as the
// earlier competitions-before-scaling-to-teams/fixtures step). See
// docs/plans/2026-08-14-players-compare-route.md.
const [premierLeague] = await db
	.select({ id: competitions.id })
	.from(competitions)
	.where(eq(competitions.name, "Premier League"));

if (premierLeague) {
	const [finishedSeason] = await db
		.select({ id: seasons.id, sportmonksId: seasons.sportmonksId })
		.from(seasons)
		.where(
			and(
				eq(seasons.competitionId, premierLeague.id),
				eq(seasons.isCurrent, false),
			),
		)
		.orderBy(desc(seasons.endDate))
		.limit(1);

	if (finishedSeason) {
		const finishedSeasonTeams = await fetchSeasonTeams(
			sportmonksToken,
			finishedSeason.sportmonksId,
		);
		const finishedSeasonTeamsResult = await ingestTeams(
			db,
			finishedSeasonTeams,
		);
		console.log(
			`ingested finished-season teams: fetched ${finishedSeasonTeamsResult.fetched}, upserted ${finishedSeasonTeamsResult.upserted}, failed ${finishedSeasonTeamsResult.failed.length}`,
		);

		const squadMemberLists = await Promise.all(
			finishedSeasonTeams.map((team) =>
				fetchTeamSquad(sportmonksToken, team.id, finishedSeason.sportmonksId),
			),
		);
		const playerIds = [
			...new Set(squadMemberLists.flat().map((member) => member.player_id)),
		];

		const rawPlayers: Array<SportmonksPlayerRaw> = [];
		for (const playerId of playerIds) {
			rawPlayers.push(await fetchPlayerWithStats(sportmonksToken, playerId));
		}

		const playersResult = await ingestPlayers(db, rawPlayers);
		console.log(
			`ingested players: fetched ${playersResult.fetched}, upserted ${playersResult.upserted}, failed ${playersResult.failed.length}`,
		);
		if (playersResult.failed.length > 0) {
			console.log("player failures:", playersResult.failed);
		}

		const playerSeasonStatsResult = await ingestPlayerSeasonStats(
			db,
			rawPlayers,
			finishedSeason.sportmonksId,
		);
		console.log(
			`ingested player season stats: fetched ${playerSeasonStatsResult.fetched}, upserted ${playerSeasonStatsResult.upserted}, failed ${playerSeasonStatsResult.failed.length}`,
		);
		if (playerSeasonStatsResult.failed.length > 0) {
			console.log(
				"player season stats failures:",
				playerSeasonStatsResult.failed,
			);
		}
	}
}

await db.$client.end();
