import { z } from "zod";

import { SortDirection } from "@/types";

// Mirrors apps/api's default (routes/players/list-query.ts); no shared
// package exports it across the two runtimes, so it must stay in sync by hand.
export const DEFAULT_PAGE_SIZE = 25;

interface SortableSearchSchema<FieldEnum extends Record<string, string>> {
	sort: z.ZodCatch<z.ZodOptional<z.ZodEnum<FieldEnum>>>;
	sortDirection: z.ZodCatch<z.ZodOptional<z.ZodEnum<typeof SortDirection>>>;
}

export const ListSearchSchema = z.object({
	page: z.number().int().positive().catch(1),
	pageSize: z.number().int().positive().catch(DEFAULT_PAGE_SIZE),
	search: z.string().min(1).optional().catch(undefined),
});

export type ListSearchParams = z.infer<typeof ListSearchSchema>;

// `fieldEnum`'s members must match the MRT column `accessorKey`s a route's
// table will sort by — that coupling is implicit, same as before this was
// extracted, just shared across every route that needs sortable columns now.
export const createSortableSearchSchema = <
	FieldEnum extends Record<string, string>,
>(
	fieldEnum: FieldEnum,
): SortableSearchSchema<FieldEnum> => ({
	sort: z.enum(fieldEnum).optional().catch(undefined),
	sortDirection: z.enum(SortDirection).optional().catch(undefined),
});
