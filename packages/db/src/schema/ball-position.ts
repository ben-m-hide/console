import { doublePrecision, index, integer, pgTable } from "drizzle-orm/pg-core";

import { fixtures } from "./fixture.ts";

export const ballPositions = pgTable(
	"ball_positions",
	{
		id: integer().primaryKey().generatedAlwaysAsIdentity(),
		fixtureId: integer()
			.notNull()
			.references(() => fixtures.id),
		sportmonksId: integer().notNull().unique(),
		periodId: integer().notNull(),
		timer: doublePrecision().notNull(),
		x: doublePrecision().notNull(),
		y: doublePrecision().notNull(),
	},
	(table) => [index().on(table.fixtureId)],
);
