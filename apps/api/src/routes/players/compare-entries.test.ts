import {
	buildCompareEntries,
	type PeerStats,
	type PlayerCompareRow,
	resolvePlayerRows,
} from "./compare-entries";

const attackerRow = (
	overrides: Partial<PlayerCompareRow> = {},
): PlayerCompareRow => ({
	playerId: 1,
	minutesPlayed: 2000,
	goals: 10,
	assists: 2,
	xg: 9,
	goalsPer90: 0.45,
	assistsPer90: 0.09,
	xgPer90: 0.405,
	name: "Attacker One",
	position: "Attacker",
	team: "Team A",
	...overrides,
});

describe("resolvePlayerRows", () => {
	it("keys rows by playerId with no missing ids", () => {
		const rowOne = attackerRow({ playerId: 1 });
		const rowTwo = attackerRow({ playerId: 2 });

		const result = resolvePlayerRows([1, 2], [rowOne, rowTwo]);

		expect(result.missingPlayerIds).toEqual([]);
		expect(result.rowByPlayerId.get(1)).toEqual(rowOne);
		expect(result.rowByPlayerId.get(2)).toEqual(rowTwo);
	});

	it("resolves a mid-season transfer to the stint with the most minutes", () => {
		const firstStint = attackerRow({
			playerId: 1,
			team: "Old Team",
			minutesPlayed: 400,
		});
		const secondStint = attackerRow({
			playerId: 1,
			team: "New Team",
			minutesPlayed: 1200,
		});

		const result = resolvePlayerRows([1], [firstStint, secondStint]);

		expect(result.rowByPlayerId.get(1)?.team).toBe("New Team");
	});

	it("resolves a mid-season transfer regardless of row order", () => {
		const firstStint = attackerRow({
			playerId: 1,
			team: "Old Team",
			minutesPlayed: 400,
		});
		const secondStint = attackerRow({
			playerId: 1,
			team: "New Team",
			minutesPlayed: 1200,
		});

		const result = resolvePlayerRows([1], [secondStint, firstStint]);

		expect(result.rowByPlayerId.get(1)?.team).toBe("New Team");
	});

	it("reports a requested player id with no row as missing", () => {
		const rowOne = attackerRow({ playerId: 1 });

		const result = resolvePlayerRows([1, 999], [rowOne]);

		expect(result.missingPlayerIds).toEqual([999]);
	});
});

describe("buildCompareEntries", () => {
	it("computes a percentile as the share of peers with a lower value", () => {
		const row = attackerRow({ playerId: 1, goalsPer90: 0.6 });
		const rowByPlayerId = new Map([[1, row]]);
		const peers: Array<PeerStats> = [
			{ goalsPer90: 0.1, assistsPer90: 0, xgPer90: 0 },
			{ goalsPer90: 0.3, assistsPer90: 0, xgPer90: 0 },
			{ goalsPer90: 0.5, assistsPer90: 0, xgPer90: 0 },
			{ goalsPer90: 0.9, assistsPer90: 0, xgPer90: 0 },
		];
		const peersByPosition = new Map([["Attacker", peers]]);

		const [entry] = buildCompareEntries([1], 7, rowByPlayerId, peersByPosition);

		// outperforms 3 of 4 peers (0.1, 0.3, 0.5 are all < 0.6)
		expect(entry?.percentiles.goalsPer90).toBe(75);
		expect(entry?.peerGroupSize).toBe(4);
		expect(entry?.seasonId).toBe(7);
	});

	it("returns a null percentile when the peer group is empty", () => {
		const row = attackerRow({ playerId: 1 });
		const rowByPlayerId = new Map([[1, row]]);
		const peersByPosition = new Map<string, Array<PeerStats>>([
			["Attacker", []],
		]);

		const [entry] = buildCompareEntries([1], 7, rowByPlayerId, peersByPosition);

		expect(entry?.percentiles.goalsPer90).toBeNull();
		expect(entry?.percentiles.assistsPer90).toBeNull();
		expect(entry?.percentiles.xgPer90).toBeNull();
		expect(entry?.peerGroupSize).toBe(0);
	});

	it("compares each player against only their own position's peer group", () => {
		const attacker = attackerRow({
			playerId: 1,
			position: "Attacker",
			goalsPer90: 0.6,
		});
		const midfielder: PlayerCompareRow = {
			...attackerRow({ playerId: 2, goalsPer90: 0.2 }),
			position: "Midfielder",
		};
		const rowByPlayerId = new Map([
			[1, attacker],
			[2, midfielder],
		]);
		const peersByPosition = new Map<string, Array<PeerStats>>([
			["Attacker", [{ goalsPer90: 0.1, assistsPer90: 0, xgPer90: 0 }]],
			["Midfielder", [{ goalsPer90: 0.5, assistsPer90: 0, xgPer90: 0 }]],
		]);

		const entries = buildCompareEntries(
			[1, 2],
			7,
			rowByPlayerId,
			peersByPosition,
		);

		expect(entries.find((entry) => entry.playerId === 1)?.peerGroupSize).toBe(
			1,
		);
		expect(entries.find((entry) => entry.playerId === 2)?.peerGroupSize).toBe(
			1,
		);
		// attacker (0.6) outperforms their one peer (0.1) -> 100th percentile
		expect(
			entries.find((entry) => entry.playerId === 1)?.percentiles.goalsPer90,
		).toBe(100);
		// midfielder (0.2) does not outperform their one peer (0.5) -> 0th percentile
		expect(
			entries.find((entry) => entry.playerId === 2)?.percentiles.goalsPer90,
		).toBe(0);
	});

	it("preserves the requested id order in the output", () => {
		const rowByPlayerId = new Map([
			[1, attackerRow({ playerId: 1 })],
			[2, attackerRow({ playerId: 2 })],
		]);
		const peersByPosition = new Map<string, Array<PeerStats>>([
			["Attacker", []],
		]);

		const entries = buildCompareEntries(
			[2, 1],
			7,
			rowByPlayerId,
			peersByPosition,
		);

		expect(entries.map((entry) => entry.playerId)).toEqual([2, 1]);
	});
});
