import { z } from "zod";

export const BallPositionSchema = z.object({
	id: z.number().int().positive(),
	fixtureId: z.number().int().positive(),
	sportmonksId: z.number().int().positive(),
	periodId: z.number().int().positive(),
	timer: z.number().nonnegative(),
	x: z.number(),
	y: z.number(),
});

export type BallPosition = z.infer<typeof BallPositionSchema>;
