import { type OpenAPIHono } from "@hono/zod-openapi";

import { registerCompetitionsListRoute } from "./competitions/list-route";
import { registerPlayersCompareRoute } from "./players/compare-route";
import { registerPlayersListRoute } from "./players/list-route";
import { registerSeasonsListRoute } from "./seasons/list-route";

// A composition root, not a re-export barrel — only register functions are
// exported, each domain's query/schema helpers stay internal to its own
// folder. Adding a route here doesn't touch src/index.ts; rate-limiter
// mounts deliberately stay there instead, so throttling stays a conscious
// per-route decision, not inherited from this list.
export const registerRoutes = (app: OpenAPIHono): void => {
	registerCompetitionsListRoute(app);
	registerSeasonsListRoute(app);
	registerPlayersListRoute(app);
	registerPlayersCompareRoute(app);
};
