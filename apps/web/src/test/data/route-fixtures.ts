import type { PlayerListMeta } from "@/routes/-queries/players";

interface SamplePlayersResponse {
	data: Array<unknown>;
	meta: PlayerListMeta;
}

export const samplePlayersResponse = (
	players: Array<unknown>,
	total: number,
): SamplePlayersResponse => ({
	data: players,
	meta: { page: 1, pageSize: 25, total, totalPages: Math.ceil(total / 25) },
});
