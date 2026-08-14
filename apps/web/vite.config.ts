/// <reference types="vitest/config" />
import { devtools } from "@tanstack/devtools-vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import bundlesize from "vite-plugin-bundlesize";

// https://vite.dev/config/
export default defineConfig({
	plugins: [
		devtools(),
		tanstackRouter({ target: "react", autoCodeSplitting: true }),
		react(),
		bundlesize({
			limits: [
				// Note: this plugin (v0.3.0) only enforces limits on JS chunks — a
				// `**/*.css` entry here is silently ignored (verified empirically).
				{ name: "**/*.js", limit: "150 kB", mode: "gzip" },
				{ name: "**/*", limit: Infinity },
			],
		}),
	],
	resolve: {
		alias: {
			"@": `${import.meta.dirname}/src`,
		},
	},
	build: {
		sourcemap: "hidden",
	},
	test: {
		globals: true,
		environment: "jsdom",
		// Scoped to src/ so a future infra/**/*.test.ts (CDK assertions need a
		// plain Node environment, not jsdom) doesn't get swept in here.
		include: ["src/**/*.test.{ts,tsx}"],
		setupFiles: ["./src/test/setup.ts"],
		coverage: {
			provider: "v8",
			exclude: ["src/routeTree.gen.ts"],
			reporter: ["text", "json-summary", "json"],
			reportOnFailure: true,
		},
	},
});
