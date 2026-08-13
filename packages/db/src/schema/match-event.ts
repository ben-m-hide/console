import { index, integer, pgTable, text } from "drizzle-orm/pg-core";

import { fixtures } from "./fixture";
import { players } from "./player";

// PROJECT.md §2/§11 Phase 2 call for CHECK constraints scoping `outcome`/
// `bodyPart`/`situation` per `type` (the wide-table trade-off's DB-level
// honesty check). Not implemented: Sportmonks' actual `type` enum values are
// unconfirmed anywhere in this codebase (see packages/shared's MatchEventSchema
// — `type` is plain `string()` for the same reason), so there's no verified
// per-type field-requirement list to encode. Writing CHECK constraints against
// invented type values would fail the "never guess" rule. Revisit once Phase 4
// (Sportmonks API client) surfaces the real `type`/`sub_type_id` values.
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
