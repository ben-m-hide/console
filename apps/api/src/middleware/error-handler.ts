import { type Hook } from "@hono/zod-openapi";
import { type Env, type ErrorHandler, type NotFoundHandler } from "hono";
import { HTTPException } from "hono/http-exception";

import { errorEnvelope } from "./error-envelope";

// PROJECT.md §9: every error response uses this envelope, not Hono's raw
// text/JSON defaults.
export const errorHandler: ErrorHandler = (err, c) => {
	if (err instanceof HTTPException) {
		return c.json(errorEnvelope(err.status, err.message), err.status);
	}

	return c.json(errorEnvelope(500, "Internal Server Error"), 500);
};

export const notFoundHandler: NotFoundHandler = (c) =>
	c.json(errorEnvelope(404, "Not Found"), 404);

// @hono/zod-openapi's request validation responds directly rather than
// throwing, so app.onError never sees it — without this hook it returns its
// own raw ZodError shape instead of this app's envelope (PROJECT.md §9).
export const validationErrorHook: Hook<
	unknown,
	Env,
	string,
	Response | undefined
> = (result, c) => {
	if (!result.success) {
		const firstIssue = result.error.issues[0];
		return c.json(
			errorEnvelope(400, firstIssue?.message ?? "Invalid request"),
			400,
		);
	}
	return undefined;
};
