import { Hono } from "hono";

import { publicApiRateLimiter } from "./rate-limiter";

const buildApp = (): Hono => {
	const app = new Hono();
	app.use("/limited", publicApiRateLimiter);
	app.get("/limited", (c) => c.json({ ok: true }));
	return app;
};

describe("publicApiRateLimiter", () => {
	it("allows a request under the limit through", async () => {
		const app = buildApp();

		const response = await app.request("/limited", {
			headers: { "x-forwarded-for": "203.0.113.1" },
		});

		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({ ok: true });
	});

	it("returns the error envelope once the limit is exceeded", async () => {
		const app = buildApp();
		const ip = "203.0.113.2";

		for (let requestNumber = 0; requestNumber < 100; requestNumber++) {
			const okResponse = await app.request("/limited", {
				headers: { "x-forwarded-for": ip },
			});
			expect(okResponse.status).toBe(200);
		}

		const limitedResponse = await app.request("/limited", {
			headers: { "x-forwarded-for": ip },
		});

		expect(limitedResponse.status).toBe(429);
		expect(await limitedResponse.json()).toEqual({
			error: { code: 429, message: "Too many requests" },
		});
	});

	it("tracks separate IPs independently", async () => {
		const app = buildApp();

		for (let requestNumber = 0; requestNumber < 100; requestNumber++) {
			await app.request("/limited", {
				headers: { "x-forwarded-for": "203.0.113.3" },
			});
		}

		const otherIpResponse = await app.request("/limited", {
			headers: { "x-forwarded-for": "203.0.113.4" },
		});

		expect(otherIpResponse.status).toBe(200);
	});
});
