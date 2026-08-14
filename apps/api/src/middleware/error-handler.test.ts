import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";

import {
	errorHandler,
	notFoundHandler,
	validationErrorHook,
} from "./error-handler";

describe("errorHandler", () => {
	it("maps a thrown HTTPException to the error envelope, keeping its status", async () => {
		const app = new Hono();
		app.onError(errorHandler);
		app.get("/forbidden", () => {
			throw new HTTPException(403, { message: "forbidden" });
		});

		const response = await app.request("/forbidden");

		expect(response.status).toBe(403);
		expect(await response.json()).toEqual({
			error: { code: 403, message: "forbidden" },
		});
	});

	it("maps any other thrown error to a generic 500 envelope", async () => {
		const app = new Hono();
		app.onError(errorHandler);
		app.get("/boom", () => {
			throw new Error("something broke");
		});

		const response = await app.request("/boom");

		expect(response.status).toBe(500);
		expect(await response.json()).toEqual({
			error: { code: 500, message: "Internal Server Error" },
		});
	});
});

describe("notFoundHandler", () => {
	it("returns a 404 envelope for an unmatched route", async () => {
		const app = new Hono();
		app.notFound(notFoundHandler);

		const response = await app.request("/nope");

		expect(response.status).toBe(404);
		expect(await response.json()).toEqual({
			error: { code: 404, message: "Not Found" },
		});
	});
});

describe("validationErrorHook", () => {
	const querySchema = z.object({
		season: z.string().regex(/^\d+$/, "season must be a positive integer"),
	});
	const route = createRoute({
		method: "get",
		path: "/players",
		request: { query: querySchema },
		responses: {
			200: {
				content: {
					"application/json": { schema: z.object({ ok: z.boolean() }) },
				},
				description: "ok",
			},
		},
	});

	const buildApp = (): OpenAPIHono => {
		const app = new OpenAPIHono({ defaultHook: validationErrorHook });
		app.openapi(route, (c) => c.json({ ok: true }));
		return app;
	};

	it("returns the error envelope for a failed query validation", async () => {
		const app = buildApp();

		const response = await app.request("/players?season=not-a-number");

		expect(response.status).toBe(400);
		expect(await response.json()).toEqual({
			error: { code: 400, message: "season must be a positive integer" },
		});
	});

	it("does not interfere with a request that passes validation", async () => {
		const app = buildApp();

		const response = await app.request("/players?season=7");

		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({ ok: true });
	});
});
