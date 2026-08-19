import { type PaginationMeta } from "@console-next/shared";
import { type MRT_ColumnDef } from "mantine-react-table";

import { renderWithProviders } from "@/test/render-with-providers";

import { DataTable } from "./DataTable";

interface TestRow extends Record<string, unknown> {
	id: number;
	name: string;
}

interface TestSearch {
	page: number;
	pageSize: number;
	search?: string;
}

const columns: Array<MRT_ColumnDef<TestRow>> = [
	{ accessorKey: "name", header: "Name" },
];

const filterFields = { name: "search" } as const;

const baseMeta: PaginationMeta = {
	page: 1,
	pageSize: 25,
	total: 0,
	totalPages: 0,
};

const renderDataTable = (overrides: {
	data?: Array<TestRow>;
	meta?: PaginationMeta;
	search?: TestSearch;
}): ReturnType<typeof renderWithProviders> =>
	renderWithProviders(
		<DataTable
			columns={columns}
			data={overrides.data ?? []}
			meta={overrides.meta ?? baseMeta}
			search={overrides.search ?? { page: 1, pageSize: 25 }}
			setSearch={vi.fn().mockResolvedValue(undefined)}
			filterFields={filterFields}
			entityNamePlural="items"
		/>,
	);

describe("DataTable", () => {
	it("renders a generic empty state when there is no data and no active filters", () => {
		const { getByText } = renderDataTable({});

		expect(getByText("No items found")).toBeInTheDocument();
		expect(getByText("No items are available.")).toBeInTheDocument();
	});

	it("keeps the column header visible alongside the empty state", () => {
		const { getByText } = renderDataTable({});

		expect(getByText("Name")).toBeInTheDocument();
		expect(getByText("No items found")).toBeInTheDocument();
	});

	it("renders a filtered-empty state with a clear-filters action when a filter is active", () => {
		const { getByText, getByRole } = renderDataTable({
			search: { page: 1, pageSize: 25, search: "zzz" },
		});

		expect(getByText("No items found")).toBeInTheDocument();
		expect(
			getByText("No items match the current search and filters."),
		).toBeInTheDocument();
		expect(getByRole("button", { name: "Clear filters" })).toBeInTheDocument();
	});

	it("renders a page-out-of-range empty state with a go-to-first-page action", () => {
		const { getByText, getByRole } = renderDataTable({
			meta: { page: 5, pageSize: 25, total: 40, totalPages: 2 },
			search: { page: 5, pageSize: 25 },
		});

		expect(getByText("Page not found")).toBeInTheDocument();
		expect(
			getByText("Page 5 is past the last page of results."),
		).toBeInTheDocument();
		expect(
			getByRole("button", { name: "Go to first page" }),
		).toBeInTheDocument();
	});

	it("renders the table instead of an empty state when data is present", () => {
		const { getByText, queryByText } = renderDataTable({
			data: [{ id: 1, name: "Alice" }],
			meta: { page: 1, pageSize: 25, total: 1, totalPages: 1 },
		});

		expect(getByText("Alice")).toBeInTheDocument();
		expect(queryByText("No items found")).not.toBeInTheDocument();
	});
});
