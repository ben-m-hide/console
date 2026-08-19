import { renderHook } from "@testing-library/react";

import { SortDirection } from "@/types";

import {
	type ServerDataTableSearch,
	useServerDataTable,
} from "./useServerDataTable";

interface TestRow extends Record<string, unknown> {
	id: number;
}

interface TestSearch extends ServerDataTableSearch {
	sort?: "name" | "position";
	search?: string;
	position?: string;
}

const baseSearch: TestSearch = { page: 1, pageSize: 25 };

const filterFields = { name: "search", position: "position" } as const;

interface TestHookHarness {
	result: {
		current: ReturnType<
			typeof useServerDataTable<TestRow, TestSearch, typeof filterFields>
		>;
	};
	setSearch: ReturnType<typeof vi.fn>;
}

const renderTestHook = (search: TestSearch): TestHookHarness => {
	const setSearch = vi.fn().mockResolvedValue(undefined);
	const { result } = renderHook(() =>
		useServerDataTable<TestRow, TestSearch, typeof filterFields>({
			search,
			setSearch,
			filterFields,
		}),
	);
	return { result, setSearch };
};

describe("useServerDataTable", () => {
	describe("onPaginationChange", () => {
		it("converts a direct MRT pagination value into 1-based search params", async () => {
			const { result, setSearch } = renderTestHook(baseSearch);

			await result.current.onPaginationChange({ pageIndex: 2, pageSize: 50 });

			const updater = setSearch.mock.calls[0]?.[0] as (
				previous: TestSearch,
			) => TestSearch;
			expect(updater(baseSearch)).toEqual({ page: 3, pageSize: 50 });
		});

		it("resolves an MRT updater function against the current search state", async () => {
			const search: TestSearch = { page: 3, pageSize: 25 };
			const { result, setSearch } = renderTestHook(search);

			await result.current.onPaginationChange((previous) => ({
				...previous,
				pageIndex: previous.pageIndex + 1,
			}));

			const updater = setSearch.mock.calls[0]?.[0] as (
				previous: TestSearch,
			) => TestSearch;
			expect(updater(search)).toEqual({ page: 4, pageSize: 25 });
		});
	});

	describe("onSortingChange", () => {
		it("sets sort/sortDirection and resets to page 1", async () => {
			const { result, setSearch } = renderTestHook(baseSearch);

			await result.current.onSortingChange([{ id: "name", desc: true }]);

			const updater = setSearch.mock.calls[0]?.[0] as (
				previous: TestSearch,
			) => TestSearch;
			expect(updater(baseSearch)).toEqual({
				page: 1,
				pageSize: 25,
				sort: "name",
				sortDirection: SortDirection.Desc,
			});
		});

		it("clears sort/sortDirection when the sorting array is emptied", async () => {
			const search: TestSearch = {
				page: 2,
				pageSize: 25,
				sort: "name",
				sortDirection: SortDirection.Asc,
			};
			const { result, setSearch } = renderTestHook(search);

			await result.current.onSortingChange([]);

			const updater = setSearch.mock.calls[0]?.[0] as (
				previous: TestSearch,
			) => TestSearch;
			expect(updater(search)).toEqual({
				page: 1,
				pageSize: 25,
				sort: undefined,
				sortDirection: undefined,
			});
		});
	});

	describe("onColumnFiltersChange", () => {
		it("maps a mapped column's value onto its search param and resets to page 1", async () => {
			const { result, setSearch } = renderTestHook(baseSearch);

			await result.current.onColumnFiltersChange([
				{ id: "name", value: "Haaland" },
				{ id: "position", value: "" },
			]);

			const updater = setSearch.mock.calls[0]?.[0] as (
				previous: TestSearch,
			) => TestSearch;
			expect(updater(baseSearch)).toEqual({
				page: 1,
				pageSize: 25,
				search: "Haaland",
				position: undefined,
			});
		});

		it("normalizes an empty string filter value to undefined", async () => {
			const search: TestSearch = { page: 2, pageSize: 25, search: "Haaland" };
			const { result, setSearch } = renderTestHook(search);

			await result.current.onColumnFiltersChange([{ id: "name", value: "" }]);

			const updater = setSearch.mock.calls[0]?.[0] as (
				previous: TestSearch,
			) => TestSearch;
			expect(updater(search)).toEqual({
				page: 1,
				pageSize: 25,
				search: undefined,
			});
		});
	});

	describe("hasActiveFilters", () => {
		it("is false when no mapped filter field has a value", () => {
			const { result } = renderTestHook(baseSearch);
			expect(result.current.hasActiveFilters).toBe(false);
		});

		it("is true when a mapped filter field has a value", () => {
			const { result } = renderTestHook({
				...baseSearch,
				position: "Defender",
			});
			expect(result.current.hasActiveFilters).toBe(true);
		});
	});

	describe("clearFilters", () => {
		it("clears every mapped filter field and resets to page 1", async () => {
			const search: TestSearch = {
				page: 3,
				pageSize: 25,
				search: "Haaland",
				position: "Defender",
			};
			const { result, setSearch } = renderTestHook(search);

			await result.current.clearFilters();

			const updater = setSearch.mock.calls[0]?.[0] as (
				previous: TestSearch,
			) => TestSearch;
			expect(updater(search)).toEqual({
				page: 1,
				pageSize: 25,
				search: undefined,
				position: undefined,
			});
		});
	});

	describe("goToFirstPage", () => {
		it("resets only the page, leaving other search params untouched", async () => {
			const search: TestSearch = {
				page: 5,
				pageSize: 25,
				search: "Haaland",
				sort: "name",
			};
			const { result, setSearch } = renderTestHook(search);

			await result.current.goToFirstPage();

			const updater = setSearch.mock.calls[0]?.[0] as (
				previous: TestSearch,
			) => TestSearch;
			expect(updater(search)).toEqual({ ...search, page: 1 });
		});
	});

	describe("state", () => {
		it("derives pagination/sorting/columnFilters from the current search", () => {
			const search: TestSearch = {
				page: 2,
				pageSize: 25,
				sort: "name",
				sortDirection: SortDirection.Desc,
				search: "Haaland",
			};
			const { result } = renderTestHook(search);

			expect(result.current.state).toEqual({
				pagination: { pageIndex: 1, pageSize: 25 },
				sorting: [{ id: "name", desc: true }],
				columnFilters: [
					{ id: "name", value: "Haaland" },
					{ id: "position", value: "" },
				],
			});
		});
	});
});
