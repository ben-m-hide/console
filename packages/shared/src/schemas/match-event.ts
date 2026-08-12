import { z } from "zod";

export const MatchEventSchema = z.object({
	id: z.number().int().positive(),
	fixtureId: z.number().int().positive(),
	sportmonksEventId: z.number().int().positive(),
	type: z.string(),
	playerId: z.number().int().positive(),
	relatedPlayerId: z.number().int().positive().nullable(),
	minute: z.number().int().nonnegative(),
	outcome: z.string().nullable(),
	bodyPart: z.string().nullable(),
	situation: z.string().nullable(),
});

export type MatchEvent = z.infer<typeof MatchEventSchema>;
