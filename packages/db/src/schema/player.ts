import { date, integer, pgTable, text } from "drizzle-orm/pg-core";

export const players = pgTable("players", {
	id: integer().primaryKey().generatedAlwaysAsIdentity(),
	sportmonksId: integer().notNull().unique(),
	name: text().notNull(),
	dateOfBirth: date().notNull(),
	nationality: text().notNull(),
	position: text().notNull(),
});
