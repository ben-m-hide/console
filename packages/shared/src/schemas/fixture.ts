import { z } from "zod";

export const FixtureSchema = z.object({
	id: z.number().int().positive(),
	sportmonksId: z.number().int().positive(),
	seasonId: z.number().int().positive(),
	homeTeamId: z.number().int().positive(),
	awayTeamId: z.number().int().positive(),
	kickoffAt: z.iso.datetime(),
	status: z.string(),
	homeScore: z.number().int().nonnegative().nullable(),
	awayScore: z.number().int().nonnegative().nullable(),
});

export type Fixture = z.infer<typeof FixtureSchema>;
