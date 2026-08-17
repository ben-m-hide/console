import type { PlayerListMeta } from "@/routes/-queries/players";

export const SAMPLE_COMPETITIONS = [
	{ id: 1, sportmonksId: 8, name: "Premier League", country: "England" },
	{ id: 2, sportmonksId: 82, name: "Bundesliga", country: "Germany" },
];

export const SAMPLE_PLAYERS = [
	{
		id: 1,
		sportmonksId: 101,
		name: "Erling Haaland",
		dateOfBirth: "2000-07-21",
		nationality: "Norway",
		position: "Attacker",
	},
	{
		id: 2,
		sportmonksId: 102,
		name: "Alisson Becker",
		dateOfBirth: "1992-10-02",
		nationality: "Brazil",
		position: "Goalkeeper",
	},
];

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
