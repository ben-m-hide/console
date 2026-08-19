import { type PaginationMeta } from "@console-next/shared";
import { Button, EmptyState } from "@mantine/core";
import {
	type MRT_ColumnDef as ColumnDef,
	MantineReactTable,
	type MRT_TableOptions as TableOptions,
	useMantineReactTable,
} from "mantine-react-table";
import { type ReactElement, useCallback } from "react";

import {
	type FilterFieldMap,
	type ServerDataTableSearch,
	useServerDataTable,
} from "@/hooks/DataTable/useServerDataTable";

export type { ColumnDef, TableOptions };

type ManagedOptionKeys =
	| "columns"
	| "data"
	| "state"
	| "manualPagination"
	| "manualSorting"
	| "manualFiltering"
	| "onPaginationChange"
	| "onSortingChange"
	| "onColumnFiltersChange"
	| "rowCount"
	| "pageCount"
	| "paginationDisplayMode"
	| "enablePagination"
	| "renderEmptyRowsFallback";

interface DataTableProps<
	Data extends Record<string, unknown>,
	Search extends ServerDataTableSearch,
	FilterFields extends FilterFieldMap<Search>,
> extends Omit<TableOptions<Data>, ManagedOptionKeys> {
	columns: Array<ColumnDef<Data>>;
	data: Array<Data>;
	meta: PaginationMeta;
	search: Search;
	setSearch: (updater: (previous: Search) => Search) => Promise<void>;
	filterFields: FilterFields;
	entityNamePlural: string;
	isFetching?: boolean;
}

export const DataTable = <
	Data extends Record<string, unknown>,
	Search extends ServerDataTableSearch,
	FilterFields extends FilterFieldMap<Search>,
>({
	columns,
	data,
	meta,
	search,
	setSearch,
	filterFields,
	entityNamePlural,
	isFetching = false,
	...tableOptions
}: DataTableProps<Data, Search, FilterFields>): ReactElement => {
	const {
		state,
		onPaginationChange,
		onSortingChange,
		onColumnFiltersChange,
		hasActiveFilters,
		clearFilters,
		goToFirstPage,
	} = useServerDataTable<Data, Search, FilterFields>({
		search,
		setSearch,
		filterFields,
	});

	const { totalPages, total, pageSize } = meta;

	// Clamp only what MRT sees — an out-of-range pageIndex makes Mantine's
	// Pagination self-correct via onPaginationChange, overwriting the URL.
	const currentPagination = state.pagination ?? {
		pageIndex: 0,
		pageSize,
	};
	const pageIndex = Math.min(
		currentPagination.pageIndex,
		Math.max(totalPages - 1, 0),
	);

	const renderEmptyRowsFallback = useCallback(() => {
		const isPageOutOfRange = total > 0;

		return (
			<EmptyState
				p="xl"
				title={
					isPageOutOfRange ? "Page not found" : `No ${entityNamePlural} found`
				}
				description={
					isPageOutOfRange
						? `Page ${String(search.page)} is past the last page of results.`
						: hasActiveFilters
							? `No ${entityNamePlural} match the current search and filters.`
							: `No ${entityNamePlural} are available.`
				}
			>
				{isPageOutOfRange ? (
					<EmptyState.Actions>
						<Button onClick={goToFirstPage}>Go to first page</Button>
					</EmptyState.Actions>
				) : hasActiveFilters ? (
					<EmptyState.Actions>
						<Button onClick={clearFilters}>Clear filters</Button>
					</EmptyState.Actions>
				) : null}
			</EmptyState>
		);
	}, [
		clearFilters,
		entityNamePlural,
		goToFirstPage,
		hasActiveFilters,
		search.page,
		total,
	]);

	const table = useMantineReactTable<Data>({
		columns,
		data,
		manualPagination: true,
		manualSorting: true,
		manualFiltering: true,
		rowCount: total,
		pageCount: totalPages,
		paginationDisplayMode: "pages",
		state: {
			...state,
			pagination: {
				pageIndex,
				pageSize: currentPagination.pageSize,
			},
			showProgressBars: isFetching,
		},
		onPaginationChange,
		onSortingChange,
		onColumnFiltersChange,
		mantineTableContainerProps: {
			style: { maxHeight: "calc(100dvh - 16rem)" },
		},
		enablePagination: total > 0,
		renderEmptyRowsFallback,
		layoutMode: "grid",
		defaultColumn: { grow: 1 },
		...tableOptions,
	});

	return <MantineReactTable table={table} />;
};
