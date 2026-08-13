import { boolean, date, integer, pgTable, text } from "drizzle-orm/pg-core";

import { competitions } from "./competition";

export const seasons = pgTable("seasons", {
	id: integer().primaryKey().generatedAlwaysAsIdentity(),
	sportmonksId: integer().notNull().unique(),
	competitionId: integer()
		.notNull()
		.references(() => competitions.id),
	name: text().notNull(),
	startDate: date().notNull(),
	endDate: date().notNull(),
	isCurrent: boolean().notNull(),
});
