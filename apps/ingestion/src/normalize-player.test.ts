import { normalizePlayer } from "./normalize-player";
import {
	SAMPLE_PLAYER_NO_ATTACKING_STATS,
	SAMPLE_PLAYER_WELBECK,
} from "./sportmonks-fixtures";

describe("normalizePlayer", () => {
	it("maps a real Sportmonks player response to the insertable shape", () => {
		expect(normalizePlayer(SAMPLE_PLAYER_WELBECK)).toEqual({
			sportmonksId: 627,
			name: "Daniel Nii Tackie Mensah Welbeck",
			dateOfBirth: "1990-11-26",
			nationality: "England",
			position: "Attacker",
		});
	});

	it("maps a different real player's profile too", () => {
		expect(normalizePlayer(SAMPLE_PLAYER_NO_ATTACKING_STATS)).toEqual({
			sportmonksId: 37590697,
			name: "Diego Coppola",
			dateOfBirth: "2004-02-17",
			nationality: "Italy",
			position: "Defender",
		});
	});

	it("throws when nationality is missing", () => {
		const withoutNationality = { ...SAMPLE_PLAYER_WELBECK, nationality: null };
		expect(() => normalizePlayer(withoutNationality)).toThrow(/no nationality/);
	});

	it("throws when position is missing", () => {
		const withoutPosition = { ...SAMPLE_PLAYER_WELBECK, position: null };
		expect(() => normalizePlayer(withoutPosition)).toThrow(/no position/);
	});
});
