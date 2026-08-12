import { z } from "zod";

export const TeamSchema = z.object({
	id: z.number().int().positive(),
	sportmonksId: z.number().int().positive(),
	name: z.string(),
	shortName: z.string(),
	logoUrl: z.url().nullable(),
});

export type Team = z.infer<typeof TeamSchema>;
