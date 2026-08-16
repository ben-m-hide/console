import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { Scalar } from "@scalar/hono-api-reference";
import { cors } from "hono/cors";

import {
	errorHandler,
	notFoundHandler,
	validationErrorHook,
} from "./middleware/error-handler";
import { publicApiRateLimiter } from "./middleware/rate-limiter";
import { registerRoutes } from "./routes";

const HealthResponseSchema = z
	.object({
		status: z.literal("ok"),
	})
	.openapi("HealthResponse");

const healthRoute = createRoute({
	method: "get",
	path: "/api/v1/health",
	responses: {
		200: {
			content: {
				"application/json": { schema: HealthResponseSchema },
			},
			description: "The API is up",
		},
	},
});

const app = new OpenAPIHono({ defaultHook: validationErrorHook });

app.use(
	"/api/*",
	cors({ origin: process.env.API_CORS_ORIGIN ?? "http://localhost:5173" }),
);
app.onError(errorHandler);
app.notFound(notFoundHandler);

// Not applied to /api/v1/health — uptime/monitoring checks shouldn't be
// throttled, unlike the actual data routes below.
app.use("/api/v1/competitions", publicApiRateLimiter);
app.use("/api/v1/seasons", publicApiRateLimiter);
app.use("/api/v1/players/*", publicApiRateLimiter);

app.openapi(healthRoute, (c) => c.json({ status: "ok" as const }));
registerRoutes(app);

app.doc("/doc", {
	openapi: "3.1.0",
	info: {
		title: "console-next API",
		version: "0.0.0",
	},
});

app.get("/reference", Scalar({ url: "/doc" }));

export default app;
