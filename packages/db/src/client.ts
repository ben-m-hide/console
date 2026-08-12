import type { SQL } from "bun";

import { type BunSQLDatabase, drizzle } from "drizzle-orm/bun-sql";

import * as schema from "./schema/index.ts";

// connectionString must be Neon's POOLED string (the "-pooler" hostname
// suffix), not the direct one — see ADR 0012. Direct is for drizzle-kit
// migrations only (packages/db/drizzle.config.ts already uses it correctly).
export const createDb = (
	connectionString: string,
): BunSQLDatabase<typeof schema> & { $client: SQL } =>
	drizzle({
		connection: connectionString,
		schema,
		casing: "snake_case",
	});

export type Db = ReturnType<typeof createDb>;
