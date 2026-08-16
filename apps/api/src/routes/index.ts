import type { OpenAPIHono } from "@hono/zod-openapi";

import { registerCompetitionsRoute } from "./competitions";
import { registerPlayersRoute } from "./players";
import { registerPlayersCompareRoute } from "./players-compare";
import { registerSeasonsRoute } from "./seasons";

// A composition root rather than a re-export barrel: this owns the list, so
// adding a route does not touch src/index.ts at all. Only the register
// functions are exported — the build-*.ts helpers are internals of their own
// routes, not part of this directory's surface.
//
// Rate-limiter mounts deliberately stay in src/index.ts with the rest of the
// middleware chain. That means a new route still touches src/index.ts if it
// needs throttling, which is intended: whether an endpoint is rate-limited
// should be a conscious decision, not something inherited by living here.
export const registerRoutes = (app: OpenAPIHono): void => {
	registerCompetitionsRoute(app);
	registerSeasonsRoute(app);
	registerPlayersRoute(app);
	registerPlayersCompareRoute(app);
};
