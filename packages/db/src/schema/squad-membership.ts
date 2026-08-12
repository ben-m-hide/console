import { integer, pgTable, timestamp } from "drizzle-orm/pg-core";

import { players } from "./player.ts";
import { seasons } from "./season.ts";
import { teams } from "./team.ts";

export const squadMemberships = pgTable("squad_memberships", {
	id: integer().primaryKey().generatedAlwaysAsIdentity(),
	playerId: integer()
		.notNull()
		.references(() => players.id),
	teamId: integer()
		.notNull()
		.references(() => teams.id),
	seasonId: integer()
		.notNull()
		.references(() => seasons.id),
	shirtNumber: integer(),
	joinedAt: timestamp({ withTimezone: true }).notNull(),
	leftAt: timestamp({ withTimezone: true }),
});
