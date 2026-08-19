export interface CompareQuery {
	playerIds: Array<number>;
	seasonId: number;
}

export const parseCompareQuery = (
	ids: string,
	season: string,
): CompareQuery => {
	const query: CompareQuery = {
		playerIds: ids.split(",").map(Number),
		seasonId: Number(season),
	};
	return query;
};
