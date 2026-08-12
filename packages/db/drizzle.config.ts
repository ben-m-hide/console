import { defineConfig } from "drizzle-kit";

export default defineConfig({
	dialect: "postgresql",
	casing: "snake_case",
	schema: "./src/schema/index.ts",
	out: "./drizzle",
	// Direct connection string (no "-pooler" suffix), not the pooled one —
	// migrations need a direct connection per Neon's own docs. createDb() in
	// src/client.ts is the pooled-string consumer; see ADR 0012.
	dbCredentials: {
		url: process.env.DATABASE_URL ?? "",
	},
});
