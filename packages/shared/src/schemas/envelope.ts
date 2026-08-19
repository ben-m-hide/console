import { z } from "zod";

// Hand-written, not generated — unlike every *.gen.ts sibling here, there is
// no single Drizzle table to derive an envelope shape from (it wraps one or
// more entity schemas, it doesn't describe one). See docs/adr/0019-shared-
// envelope-schemas.md for why this is a separate tier from ADR 0013's
// generated one, not a gap in that generator.

export const PaginationMetaSchema = z.object({
	page: z.number().int().positive(),
	pageSize: z.number().int().positive(),
	total: z.number().int().nonnegative(),
	totalPages: z.number().int().nonnegative(),
});

export type PaginationMeta = z.infer<typeof PaginationMetaSchema>;

// One implementation for every list endpoint's { data } envelope, instead
// of a hand-rolled z.object({ data: z.array(itemSchema) }) per entity.
export const listResponseSchema = <ItemSchema extends z.ZodType>(
	itemSchema: ItemSchema,
): z.ZodType<{ data: Array<z.infer<ItemSchema>> }> =>
	z.object({ data: z.array(itemSchema) });

// Same, plus pagination meta — for list endpoints that paginate.
export const paginatedListResponseSchema = <ItemSchema extends z.ZodType>(
	itemSchema: ItemSchema,
): z.ZodType<{ data: Array<z.infer<ItemSchema>>; meta: PaginationMeta }> =>
	z.object({
		data: z.array(itemSchema),
		meta: PaginationMetaSchema,
	});

export const ErrorEnvelopeSchema = z.object({
	error: z.object({
		code: z.number().int(),
		message: z.string(),
	}),
});

export type ErrorEnvelope = z.infer<typeof ErrorEnvelopeSchema>;
