import {
	buildPageMeta,
	DEFAULT_PAGE_SIZE,
	MAX_PAGE_SIZE,
	resolvePagination,
} from "./build-players-query";

describe("resolvePagination", () => {
	it("defaults when params are absent", () => {
		expect(resolvePagination(undefined, undefined)).toEqual({
			page: 1,
			pageSize: DEFAULT_PAGE_SIZE,
			offset: 0,
		});
	});

	it("falls back to defaults for a non-numeric value rather than throwing", () => {
		expect(resolvePagination("banana", "nonsense")).toEqual({
			page: 1,
			pageSize: DEFAULT_PAGE_SIZE,
			offset: 0,
		});
	});

	it("falls back for a non-integer value", () => {
		expect(resolvePagination("2.5", "10.1").page).toBe(1);
	});

	it("computes the offset from a 1-based page", () => {
		expect(resolvePagination("3", "25")).toEqual({
			page: 3,
			pageSize: 25,
			offset: 50,
		});
	});

	it("treats page 1 as offset 0", () => {
		expect(resolvePagination("1", String(DEFAULT_PAGE_SIZE)).offset).toBe(0);
	});

	it("caps pageSize so a caller cannot request the whole table", () => {
		expect(resolvePagination("1", "5000").pageSize).toBe(MAX_PAGE_SIZE);
	});

	it("clamps a pageSize below 1 up to 1", () => {
		expect(resolvePagination("1", "0").pageSize).toBe(1);
	});

	it("clamps a page below 1 up to 1", () => {
		expect(resolvePagination("-4", "25")).toEqual({
			page: 1,
			pageSize: 25,
			offset: 0,
		});
	});
});

describe("buildPageMeta", () => {
	it("rounds totalPages up for a partial final page", () => {
		const meta = buildPageMeta(resolvePagination("1", "25"), 698);
		expect(meta.totalPages).toBe(28);
		expect(meta.total).toBe(698);
	});

	it("reports totalPages of 0 when there are no rows", () => {
		expect(buildPageMeta(resolvePagination("1", "25"), 0).totalPages).toBe(0);
	});

	it("does not round up when the total divides exactly", () => {
		expect(buildPageMeta(resolvePagination("1", "25"), 50).totalPages).toBe(2);
	});
});
