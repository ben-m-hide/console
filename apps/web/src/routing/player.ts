import { z } from "zod";

import { ListSearchSchema } from "@/routing/search";

// Confirmed against real data 2026-08-16 (all ~1,991 players scanned), not guessed.
export const PLAYER_POSITIONS = [
	"Attacker",
	"Defender",
	"Goalkeeper",
	"Midfielder",
] as const;

export type PlayerPosition = (typeof PLAYER_POSITIONS)[number];

export const PlayersSearchSchema = ListSearchSchema.extend({
	position: z.enum(PLAYER_POSITIONS).optional().catch(undefined),
});

export type PlayersSearchParams = z.infer<typeof PlayersSearchSchema>;
