import { z } from "zod";

export const SeasonSchema = z.object({
	id: z.number().int().positive(),
	sportmonksId: z.number().int().positive(),
	competitionId: z.number().int().positive(),
	name: z.string(),
	startDate: z.iso.date(),
	endDate: z.iso.date(),
	isCurrent: z.boolean(),
});

export type Season = z.infer<typeof SeasonSchema>;
