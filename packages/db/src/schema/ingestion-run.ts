import { integer, pgEnum, pgTable, text, timestamp } from "drizzle-orm/pg-core";

import { competitions } from "./competition";
import { seasons } from "./season";

// Unlike match_events.type/fixtures.status (Sportmonks-sourced, unconfirmed —
// see match-event.ts), these values are our own application's, explicitly
// named in PROJECT.md §3 step 5: "status: success/partial/failed" plus
// "running" from step 1 — safe to enum since we, not Sportmonks, define them.
export const ingestionRunStatus = pgEnum("ingestion_run_status", [
	"running",
	"success",
	"partial",
	"failed",
]);

export const ingestionRuns = pgTable("ingestion_runs", {
	id: integer().primaryKey().generatedAlwaysAsIdentity(),
	startedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
	completedAt: timestamp({ withTimezone: true }),
	status: ingestionRunStatus().notNull(),
	// Nullable: §3 step 1 records the row (status: running) before step 2
	// resolves the fetch target, so a run that fails before targeting has
	// nothing to reference yet.
	competitionId: integer().references(() => competitions.id),
	seasonId: integer().references(() => seasons.id),
	fixturesProcessed: integer().notNull().default(0),
	fixturesFailed: integer().notNull().default(0),
	errorMessage: text(),
});
