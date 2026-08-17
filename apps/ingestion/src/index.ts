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
import { toErrorMessage } from "./to-error-message";

const databaseUrl = process.env.DATABASE_URL;
const sportmonksToken = process.env.SPORTMONKS_TOKEN;

if (!databaseUrl) {
	throw new Error("DATABASE_URL is not set");
}
if (!sportmonksToken) {
	throw new Error("SPORTMONKS_TOKEN is not set");
}

const db = createDb(databaseUrl);

// Sequential: seasons' FK resolution needs competitions already ingested.
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

// Current season only, not a historical backfill yet — see TODO.md.
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

// Teams must ingest before fixtures — fixtures' homeTeamId/awayTeamId are FKs.
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

// Most-recently-*finished* season, not current (2026/2027 has ~zero minutes
// played yet). "Club Friendlies 1" excluded — see this package's CLAUDE.md
// and TODO.md's BACKLOG for why.
const PLAYER_STATS_COMPETITION_NAMES = [
	"Premier League",
	"Bundesliga",
	"La Liga",
	"Community Shield",
];

const ingestPlayersAndStatsForCompetition = async (
	competitionName: string,
): Promise<void> => {
	const [competition] = await db
		.select({ id: competitions.id })
		.from(competitions)
		.where(eq(competitions.name, competitionName));
	if (!competition) {
		return;
	}

	const [finishedSeason] = await db
		.select({ id: seasons.id, sportmonksId: seasons.sportmonksId })
		.from(seasons)
		.where(
			and(
				eq(seasons.competitionId, competition.id),
				eq(seasons.isCurrent, false),
			),
		)
		.orderBy(desc(seasons.endDate))
		.limit(1);
	if (!finishedSeason) {
		return;
	}

	const finishedSeasonTeams = await fetchSeasonTeams(
		sportmonksToken,
		finishedSeason.sportmonksId,
	);
	const finishedSeasonTeamsResult = await ingestTeams(db, finishedSeasonTeams);
	console.log(
		`ingested ${competitionName} finished-season teams: fetched ${finishedSeasonTeamsResult.fetched}, upserted ${finishedSeasonTeamsResult.upserted}, failed ${finishedSeasonTeamsResult.failed.length}`,
	);

	const squadMemberLists = await Promise.all(
		finishedSeasonTeams.map((team) =>
			fetchTeamSquad(sportmonksToken, team.id, finishedSeason.sportmonksId),
		),
	);
	const playerIds = [
		...new Set(squadMemberLists.flat().map((member) => member.player_id)),
	];

	// Per-player isolation — found live: without it, one 429 mid-loop discarded
	// the whole competition's already-fetched progress, not just that player.
	const rawPlayers: Array<SportmonksPlayerRaw> = [];
	for (const playerId of playerIds) {
		try {
			rawPlayers.push(await fetchPlayerWithStats(sportmonksToken, playerId));
		} catch (error) {
			console.log(
				`failed to fetch player ${playerId} for ${competitionName}: ${toErrorMessage(error)}`,
			);
		}
	}

	const playersResult = await ingestPlayers(db, rawPlayers);
	console.log(
		`ingested ${competitionName} players: fetched ${playersResult.fetched}, upserted ${playersResult.upserted}, failed ${playersResult.failed.length}`,
	);
	if (playersResult.failed.length > 0) {
		console.log(`${competitionName} player failures:`, playersResult.failed);
	}

	const playerSeasonStatsResult = await ingestPlayerSeasonStats(
		db,
		rawPlayers,
		finishedSeason.sportmonksId,
	);
	console.log(
		`ingested ${competitionName} player season stats: fetched ${playerSeasonStatsResult.fetched}, upserted ${playerSeasonStatsResult.upserted}, failed ${playerSeasonStatsResult.failed.length}`,
	);
	if (playerSeasonStatsResult.failed.length > 0) {
		console.log(
			`${competitionName} player season stats failures:`,
			playerSeasonStatsResult.failed,
		);
	}
};

// Sequential, with per-competition isolation — found live: without it, La
// Liga hitting a 429 stopped Community Shield from starting at all.
for (const competitionName of PLAYER_STATS_COMPETITION_NAMES) {
	try {
		await ingestPlayersAndStatsForCompetition(competitionName);
	} catch (error) {
		console.log(
			`failed to ingest players/stats for ${competitionName}: ${toErrorMessage(error)}`,
		);
	}
}

await db.$client.end();
