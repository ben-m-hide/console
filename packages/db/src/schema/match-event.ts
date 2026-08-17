import { index, integer, pgTable, text } from "drizzle-orm/pg-core";

import { fixtures } from "./fixture";
import { players } from "./player";

// PROJECT.md §2/§11 Phase 2 call for CHECK constraints scoping `outcome`/
// `bodyPart`/`situation` per `type` — not implemented, since Sportmonks'
// real `type` values are unconfirmed anywhere in this codebase (same reason
// MatchEventSchema's `type` is plain string()). Revisit once Phase 4 surfaces them.
export const matchEvents = pgTable(
	"match_events",
	{
		id: integer().primaryKey().generatedAlwaysAsIdentity(),
		fixtureId: integer()
			.notNull()
			.references(() => fixtures.id),
		sportmonksEventId: integer().notNull().unique(),
		type: text().notNull(),
		playerId: integer()
			.notNull()
			.references(() => players.id),
		relatedPlayerId: integer().references(() => players.id),
		minute: integer().notNull(),
		outcome: text(),
		bodyPart: text(),
		situation: text(),
	},
	(table) => [
		index().on(table.fixtureId),
		index().on(table.fixtureId, table.type),
	],
);
