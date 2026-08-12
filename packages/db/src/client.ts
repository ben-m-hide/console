import type { SQL } from "bun";

import { type BunSQLDatabase, drizzle } from "drizzle-orm/bun-sql";

import * as schema from "./schema/index.ts";

export const createDb = (
	connectionString: string,
): BunSQLDatabase<typeof schema> & { $client: SQL } =>
	drizzle({
		connection: connectionString,
		schema,
		casing: "snake_case",
	});

export type Db = ReturnType<typeof createDb>;
