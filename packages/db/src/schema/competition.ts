import { integer, pgTable, text } from "drizzle-orm/pg-core";

export const competitions = pgTable("competitions", {
	id: integer().primaryKey().generatedAlwaysAsIdentity(),
	sportmonksId: integer().notNull().unique("competitions_sportmonks_id_unique"),
	name: text().notNull(),
	country: text().notNull(),
	tier: integer().notNull(),
});
