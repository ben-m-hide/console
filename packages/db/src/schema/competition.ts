import { integer, pgTable, text } from "drizzle-orm/pg-core";

export const competitions = pgTable("competitions", {
	id: integer().primaryKey().generatedAlwaysAsIdentity(),
	sportmonksId: integer().notNull().unique(),
	name: text().notNull(),
	country: text().notNull(),
});
