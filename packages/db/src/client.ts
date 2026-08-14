import type { SQL } from "bun";

import { type BunSQLDatabase, drizzle } from "drizzle-orm/bun-sql";

import * as schema from "./schema/index";

export type Db = BunSQLDatabase<typeof schema> & { $client: SQL };

// connectionString must be Neon's POOLED string (the "-pooler" hostname
// suffix), not the direct one — see ADR 0012. Direct is for drizzle-kit
// migrations only (packages/db/drizzle.config.ts already uses it correctly).
//
// No app-level connection retry here, deliberately: Bun's SQL client already
// retries a cold Neon compute (ERR_POSTGRES_CONNECTION_FAILED) with backoff
// up to connectionTimeout, which defaults to 30s — comfortably more than
// Neon's own ~few-hundred-ms typical Scale-to-Zero wake time. See ADR 0012's
// Consequences section.
export const createDb = (connectionString: string): Db =>
	drizzle({
		connection: connectionString,
		schema,
		casing: "snake_case",
	});
