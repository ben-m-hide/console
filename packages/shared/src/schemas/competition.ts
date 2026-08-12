import { z } from "zod";

export const CompetitionSchema = z.object({
	id: z.number().int().positive(),
	sportmonksId: z.number().int().positive(),
	name: z.string(),
	country: z.string(),
	tier: z.number().int().positive(),
});

export type Competition = z.infer<typeof CompetitionSchema>;
