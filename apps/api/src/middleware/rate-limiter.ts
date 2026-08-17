import { rateLimiter } from "hono-rate-limiter";

// PROJECT.md §9 asks for a guard against hammering /players/compare without
// giving numbers — 100/15min matches the library's own documented default.
// In-memory store is correct while only one instance exists (no Render
// deploy yet, see TODO.md); revisit with a shared store once that changes.
export const publicApiRateLimiter = rateLimiter({
	windowMs: 15 * 60 * 1000,
	limit: 100,
	// x-forwarded-for only trustworthy behind a real reverse proxy that
	// overwrites it (Render's edge, once deployed) — spoofable otherwise.
	// Clients sharing an IP (NAT, corporate networks) share a limit — accepted
	// since there's no per-user identity to key on instead.
	keyGenerator: (c) => c.req.header("x-forwarded-for") ?? "",
	handler: (c) =>
		c.json({ error: { code: 429, message: "Too many requests" } }, 429),
});
