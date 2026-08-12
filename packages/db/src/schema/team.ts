import { integer, pgTable, text } from "drizzle-orm/pg-core";

export const teams = pgTable("teams", {
	id: integer().primaryKey().generatedAlwaysAsIdentity(),
	sportmonksId: integer().notNull().unique(),
	name: text().notNull(),
	shortName: text().notNull(),
	logoUrl: text(),
});
