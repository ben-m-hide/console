// Confirmed against real data 2026-08-16 (all ~1,991 players scanned), not guessed.
export enum PlayerPosition {
	Attacker = "Attacker",
	Defender = "Defender",
	Goalkeeper = "Goalkeeper",
	Midfielder = "Midfielder",
}

export enum PlayerField {
	Name = "name",
	Position = "position",
	Nationality = "nationality",
	DateOfBirth = "dateOfBirth",
}

export enum SortDirection {
	Asc = "asc",
	Desc = "desc",
}
