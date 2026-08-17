import type { SQL } from "bun";

import { type BunSQLDatabase, drizzle } from "drizzle-orm/bun-sql";

import * as schema from "./schema/index";

export type Db = BunSQLDatabase<typeof schema> & { $client: SQL };

// connectionString must be Neon's POOLED string ("-pooler" hostname), not
// direct — direct is for drizzle-kit migrations only. See ADR 0012.
//
// No app-level connection retry: Bun's SQL client already retries a cold
// Neon compute with backoff up to connectionTimeout (30s default), well
// past Neon's typical Scale-to-Zero wake time. See ADR 0012's Consequences.
export const createDb = (connectionString: string): Db =>
	drizzle({
		connection: connectionString,
		schema,
		casing: "snake_case",
	});
