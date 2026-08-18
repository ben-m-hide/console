import { z } from "zod";

// Mirrors apps/api's default (build-players-query.ts); no shared package
// exports it across the two runtimes, so it must stay in sync by hand.
export const DEFAULT_PAGE_SIZE = 25;

export const ListSearchSchema = z.object({
	page: z.number().int().positive().catch(1),
	pageSize: z.number().int().positive().catch(DEFAULT_PAGE_SIZE),
	search: z.string().min(1).optional().catch(undefined),
});

// "SearchParams" collides with TanStack Router's own "search params" concept.
export type ListSearchParams = z.infer<typeof ListSearchSchema>;

export const ListMetaSchema = z.object({
	page: z.number().int().positive(),
	pageSize: z.number().int().positive(),
	total: z.number().int().nonnegative(),
	totalPages: z.number().int().nonnegative(),
});

export type ListMetaParams = z.infer<typeof ListMetaSchema>;
