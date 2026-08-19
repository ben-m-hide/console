import { z } from "zod";

import {
	ErrorEnvelopeSchema,
	listResponseSchema,
	PaginationMetaSchema,
	paginatedListResponseSchema,
} from "./envelope";

const ItemSchema = z.object({ id: z.number(), name: z.string() });

describe("PaginationMetaSchema", () => {
	it("parses valid pagination meta", () => {
		const result = PaginationMetaSchema.safeParse({
			page: 1,
			pageSize: 25,
			total: 100,
			totalPages: 4,
		});
		expect(result.success).toBe(true);
	});

	it("rejects a non-positive page", () => {
		const result = PaginationMetaSchema.safeParse({
			page: 0,
			pageSize: 25,
			total: 100,
			totalPages: 4,
		});
		expect(result.success).toBe(false);
	});

	it("accepts totalPages of 0 (empty result set)", () => {
		const result = PaginationMetaSchema.safeParse({
			page: 1,
			pageSize: 25,
			total: 0,
			totalPages: 0,
		});
		expect(result.success).toBe(true);
	});
});

describe("listResponseSchema", () => {
	it("parses a bare { data } envelope for the given item schema", () => {
		const schema = listResponseSchema(ItemSchema);
		const result = schema.safeParse({
			data: [{ id: 1, name: "Premier League" }],
		});
		expect(result.success).toBe(true);
	});

	it("rejects an item that doesn't match the given schema", () => {
		const schema = listResponseSchema(ItemSchema);
		const result = schema.safeParse({ data: [{ id: "not-a-number" }] });
		expect(result.success).toBe(false);
	});
});

describe("paginatedListResponseSchema", () => {
	it("parses a { data, meta } envelope for the given item schema", () => {
		const schema = paginatedListResponseSchema(ItemSchema);
		const result = schema.safeParse({
			data: [{ id: 1, name: "Bukayo Saka" }],
			meta: { page: 1, pageSize: 25, total: 1, totalPages: 1 },
		});
		expect(result.success).toBe(true);
	});

	it("rejects a response missing meta", () => {
		const schema = paginatedListResponseSchema(ItemSchema);
		const result = schema.safeParse({ data: [] });
		expect(result.success).toBe(false);
	});
});

describe("ErrorEnvelopeSchema", () => {
	it("parses a valid error envelope", () => {
		const result = ErrorEnvelopeSchema.safeParse({
			error: { code: 404, message: "Not Found" },
		});
		expect(result.success).toBe(true);
	});

	it("rejects an envelope missing code", () => {
		const result = ErrorEnvelopeSchema.safeParse({
			error: { message: "Not Found" },
		});
		expect(result.success).toBe(false);
	});
});
