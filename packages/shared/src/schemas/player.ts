import { z } from "zod";

export const PlayerSchema = z.object({
	id: z.number().int().positive(),
	sportmonksId: z.number().int().positive(),
	name: z.string(),
	dateOfBirth: z.iso.date(),
	nationality: z.string(),
	position: z.string(),
});

export type Player = z.infer<typeof PlayerSchema>;
