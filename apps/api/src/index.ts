import { createRoute, OpenAPIHono, z } from "@hono/zod-openapi";
import { Scalar } from "@scalar/hono-api-reference";

const HealthResponseSchema = z
	.object({
		status: z.literal("ok"),
	})
	.openapi("HealthResponse");

const healthRoute = createRoute({
	method: "get",
	path: "/health",
	responses: {
		200: {
			content: {
				"application/json": { schema: HealthResponseSchema },
			},
			description: "The API is up",
		},
	},
});

const app = new OpenAPIHono();

app.openapi(healthRoute, (c) => c.json({ status: "ok" as const }));

app.doc("/doc", {
	openapi: "3.1.0",
	info: {
		title: "console-next API",
		version: "0.0.0",
	},
});

app.get("/reference", Scalar({ url: "/doc" }));

export default app;
