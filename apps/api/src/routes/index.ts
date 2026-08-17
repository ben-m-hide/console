import type { OpenAPIHono } from "@hono/zod-openapi";

import { registerCompetitionsRoute } from "./competitions";
import { registerPlayersRoute } from "./players";
import { registerPlayersCompareRoute } from "./players-compare";
import { registerSeasonsRoute } from "./seasons";

// A composition root, not a re-export barrel — only register functions are
// exported, the build-*.ts helpers stay internal to their own routes.
// Adding a route here doesn't touch src/index.ts; rate-limiter mounts
// deliberately stay there instead, so throttling stays a conscious per-route
// decision, not inherited from this list.
export const registerRoutes = (app: OpenAPIHono): void => {
	registerCompetitionsRoute(app);
	registerSeasonsRoute(app);
	registerPlayersRoute(app);
	registerPlayersCompareRoute(app);
};
