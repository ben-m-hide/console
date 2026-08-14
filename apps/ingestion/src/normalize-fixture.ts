import { FixtureSchema } from "@console-next/shared";

import {
	SPORTMONKS_CURRENT_SCORE_TYPE_ID,
	type SportmonksFixtureRaw,
} from "./sportmonks-types";

// id is DB-generated (identity column) — see normalize-competition.ts for the
// same reasoning.
const InsertableFixtureSchema = FixtureSchema.omit({ id: true });

export type InsertableFixture = ReturnType<
	typeof InsertableFixtureSchema.parse
>;

const findScoreFor = (
	scores: SportmonksFixtureRaw["scores"],
	location: "home" | "away",
): number | null => {
	const currentScore = scores.find(
		(score) =>
			score.type_id === SPORTMONKS_CURRENT_SCORE_TYPE_ID &&
			score.score.participant === location,
	);
	return currentScore?.score.goals ?? null;
};

export const normalizeFixture = (
	raw: SportmonksFixtureRaw,
	seasonIdBySportmonksId: Map<number, number>,
	teamIdBySportmonksId: Map<number, number>,
): InsertableFixture => {
	const seasonId = seasonIdBySportmonksId.get(raw.season_id);
	if (seasonId === undefined) {
		throw new Error(
			`fixture ${raw.id} (${raw.name}) references season_id ${raw.season_id}, which has no matching ingested season`,
		);
	}

	const homeParticipant = raw.participants.find(
		(participant) => participant.meta.location === "home",
	);
	const awayParticipant = raw.participants.find(
		(participant) => participant.meta.location === "away",
	);
	if (!homeParticipant || !awayParticipant) {
		throw new Error(
			`fixture ${raw.id} (${raw.name}) is missing a home and/or away participant`,
		);
	}

	const homeTeamId = teamIdBySportmonksId.get(homeParticipant.id);
	const awayTeamId = teamIdBySportmonksId.get(awayParticipant.id);
	if (homeTeamId === undefined || awayTeamId === undefined) {
		throw new Error(
			`fixture ${raw.id} (${raw.name}) references a team with no matching ingested team`,
		);
	}

	if (!raw.state) {
		throw new Error(
			`fixture ${raw.id} (${raw.name}) has no state — was include=fixtures.state omitted from the request?`,
		);
	}

	return InsertableFixtureSchema.parse({
		sportmonksId: raw.id,
		seasonId,
		homeTeamId,
		awayTeamId,
		kickoffAt: new Date(raw.starting_at_timestamp * 1000).toISOString(),
		status: raw.state.short_name,
		homeScore: findScoreFor(raw.scores, "home"),
		awayScore: findScoreFor(raw.scores, "away"),
	});
};
