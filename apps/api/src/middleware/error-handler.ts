import type { ErrorHandler, NotFoundHandler } from "hono";
import { HTTPException } from "hono/http-exception";

// PROJECT.md §9: every error response uses this envelope, not Hono's raw
// text/JSON defaults.
export const errorHandler: ErrorHandler = (err, c) => {
	if (err instanceof HTTPException) {
		return c.json(
			{ error: { code: err.status, message: err.message } },
			err.status,
		);
	}

	return c.json(
		{ error: { code: 500, message: "Internal Server Error" } },
		500,
	);
};

export const notFoundHandler: NotFoundHandler = (c) =>
	c.json({ error: { code: 404, message: "Not Found" } }, 404);
