import { type PaginationMeta } from "@console-next/shared";

interface SamplePlayersResponse {
	data: Array<unknown>;
	meta: PaginationMeta;
}

export const samplePlayersResponse = (
	players: Array<unknown>,
	total: number,
): SamplePlayersResponse => ({
	data: players,
	meta: { page: 1, pageSize: 25, total, totalPages: Math.ceil(total / 25) },
});
