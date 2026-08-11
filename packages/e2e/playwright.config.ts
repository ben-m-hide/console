import path from "node:path";

import { defineConfig } from "@playwright/test";

export default defineConfig({
	testDir: "./tests",
	use: {
		baseURL: "http://localhost:5173",
	},
	webServer: {
		command: "bun run dev",
		cwd: path.resolve(import.meta.dirname, "../.."),
		url: "http://localhost:5173",
		reuseExistingServer: !process.env.CI,
	},
});
