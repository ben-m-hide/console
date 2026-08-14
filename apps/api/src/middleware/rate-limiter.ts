import { rateLimiter } from "hono-rate-limiter";

// PROJECT.md §9: "a lightweight limiter... is a cheap guard against someone
// hammering /players/compare and eating your Render/Neon usage." No specific
// numbers given there — 100 requests/15min per IP matches the library's own
// documented default example, a reasonable starting point for a public,
// unauthenticated, read-only API. In-memory store (the library's default) is
// correct for now: no Render service is deployed yet (see TODO.md), so
// there's only ever one instance — a shared store (Redis, etc.) would be
// premature until a real multi-instance deploy exists.
export const publicApiRateLimiter = rateLimiter({
	windowMs: 15 * 60 * 1000,
	limit: 100,
	// x-forwarded-for is the standard header behind a reverse proxy (Render's
	// own edge, once deployed) — known limitation: clients sharing an IP
	// (NAT, corporate networks) share a limit too. Acceptable for a public,
	// unauthenticated API with no per-user identity to key on instead.
	keyGenerator: (c) => c.req.header("x-forwarded-for") ?? "",
	handler: (c) =>
		c.json({ error: { code: 429, message: "Too many requests" } }, 429),
});
