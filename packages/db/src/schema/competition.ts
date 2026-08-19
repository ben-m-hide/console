import { relations } from "drizzle-orm";
import { integer, pgTable, text } from "drizzle-orm/pg-core";

import { seasons } from "./season";

export const competitions = pgTable("competitions", {
	id: integer().primaryKey().generatedAlwaysAsIdentity(),
	sportmonksId: integer().notNull().unique(),
	name: text().notNull(),
	country: text().notNull(),
});

export const competitionsRelations = relations(competitions, ({ many }) => ({
	seasons: many(seasons),
}));
