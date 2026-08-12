import { z } from "zod";

export const PlayerSeasonStatsSchema = z.object({
	id: z.number().int().positive(),
	playerId: z.number().int().positive(),
	teamId: z.number().int().positive(),
	seasonId: z.number().int().positive(),
	minutesPlayed: z.number().int().nonnegative(),
	goals: z.number().int().nonnegative(),
	assists: z.number().int().nonnegative(),
	xg: z.number().nonnegative(),
	xa: z.number().nonnegative(),
	goalsPer90: z.number().nonnegative(),
	assistsPer90: z.number().nonnegative(),
	xgPer90: z.number().nonnegative(),
	xaPer90: z.number().nonnegative(),
});

export type PlayerSeasonStats = z.infer<typeof PlayerSeasonStatsSchema>;
