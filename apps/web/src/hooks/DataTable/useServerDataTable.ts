import {
	type MRT_ColumnFiltersState as ColumnFiltersState,
	type MRT_PaginationState as PaginationState,
	type MRT_SortingState as SortingState,
	type MRT_TableState as TableState,
	type MRT_Updater as Updater,
} from "mantine-react-table";
import { useCallback, useMemo } from "react";

import { SortDirection } from "@/types";

export interface ServerDataTableSearch {
	page: number;
	pageSize: number;
	sort?: string;
	sortDirection?: SortDirection;
}

// filterFields values must be string|undefined.
type OptionalStringKey<Search> = {
	[K in keyof Search]: Search[K] extends string | undefined ? K : never;
}[keyof Search];

export type FilterFieldMap<Search> = Record<string, OptionalStringKey<Search>>;

interface UseServerDataTableParams<
	Search extends ServerDataTableSearch,
	FilterFields extends FilterFieldMap<Search>,
> {
	search: Search;
	setSearch: (updater: (previous: Search) => Search) => Promise<void>;
	filterFields: FilterFields;
}

interface UseServerDataTableReturn<Data extends Record<string, unknown>> {
	state: Partial<TableState<Data>>;
	onPaginationChange: (updater: Updater<PaginationState>) => Promise<void>;
	onSortingChange: (updater: Updater<SortingState>) => Promise<void>;
	onColumnFiltersChange: (
		updater: Updater<ColumnFiltersState>,
	) => Promise<void>;
	hasActiveFilters: boolean;
	clearFilters: () => Promise<void>;
	goToFirstPage: () => Promise<void>;
}

// TS can't narrow this generic union via typeof alone.
const resolveUpdater = <Value>(
	updater: Updater<Value>,
	current: Value,
): Value =>
	typeof updater === "function"
		? (updater as (old: Value) => Value)(current)
		: updater;

const buildColumnFilters = <Search extends ServerDataTableSearch>(
	search: Search,
	filterEntries: Array<[string, OptionalStringKey<Search>]>,
): ColumnFiltersState =>
	filterEntries.map(([columnId, searchKey]) => ({
		id: columnId,
		value: search[searchKey] ?? "",
	}));

export const useServerDataTable = <
	Data extends Record<string, unknown>,
	Search extends ServerDataTableSearch,
	FilterFields extends FilterFieldMap<Search>,
>({
	search,
	setSearch,
	filterFields,
}: UseServerDataTableParams<
	Search,
	FilterFields
>): UseServerDataTableReturn<Data> => {
	const filterEntries = useMemo<Array<[string, OptionalStringKey<Search>]>>(
		() => Object.entries(filterFields),
		[filterFields],
	);

	const onPaginationChange = useCallback(
		async (updater: Updater<PaginationState>): Promise<void> => {
			const currentPagination = {
				pageIndex: search.page - 1,
				pageSize: search.pageSize,
			};
			const nextPagination = resolveUpdater(updater, currentPagination);

			await setSearch((previous) => ({
				...previous,
				page: nextPagination.pageIndex + 1,
				pageSize: nextPagination.pageSize,
			}));
		},
		[setSearch, search.page, search.pageSize],
	);

	const onSortingChange = useCallback(
		async (updater: Updater<SortingState>): Promise<void> => {
			const currentSorting =
				search.sort !== undefined
					? [
							{
								id: search.sort,
								desc: search.sortDirection === SortDirection.Desc,
							},
						]
					: [];
			const nextSorting = resolveUpdater(updater, currentSorting);
			const [primarySort] = nextSorting;

			await setSearch((previous) => ({
				...previous,
				sort: primarySort?.id,
				sortDirection:
					primarySort === undefined
						? undefined
						: primarySort.desc
							? SortDirection.Desc
							: SortDirection.Asc,
				page: 1,
			}));
		},
		[setSearch, search.sort, search.sortDirection],
	);

	const onColumnFiltersChange = useCallback(
		async (updater: Updater<ColumnFiltersState>): Promise<void> => {
			const currentFilters = buildColumnFilters(search, filterEntries);
			const nextFilters = resolveUpdater(updater, currentFilters);

			const nextEntries = filterEntries.map(
				([columnId, searchKey]): [
					OptionalStringKey<Search>,
					string | undefined,
				] => {
					const filter = nextFilters.find((entry) => entry.id === columnId);
					const nextValue =
						typeof filter?.value === "string" && filter.value.trim() !== ""
							? filter.value
							: undefined;
					return [searchKey, nextValue];
				},
			);

			// MRT's filter-input UI syncs its own internal state on mount, firing
			// this with values already matching search — skip so it doesn't reset
			// the page.
			const hasChanged = nextEntries.some(
				([searchKey, nextValue]) => search[searchKey] !== nextValue,
			);
			if (!hasChanged) {
				return;
			}

			const patch = Object.fromEntries(nextEntries);
			await setSearch((previous) => ({ ...previous, ...patch, page: 1 }));
		},
		[setSearch, search, filterEntries],
	);

	const clearFilters = useCallback(async (): Promise<void> => {
		const patch = Object.fromEntries(
			filterEntries.map(([, searchKey]) => [searchKey, undefined]),
		);

		await setSearch((previous) => ({ ...previous, ...patch, page: 1 }));
	}, [setSearch, filterEntries]);

	const goToFirstPage = useCallback(async (): Promise<void> => {
		await setSearch((previous) => ({ ...previous, page: 1 }));
	}, [setSearch]);

	const state = useMemo<Partial<TableState<Data>>>(
		() => ({
			pagination: {
				pageIndex: search.page - 1,
				pageSize: search.pageSize,
			},
			sorting:
				search.sort !== undefined
					? [
							{
								id: search.sort,
								desc: search.sortDirection === SortDirection.Desc,
							},
						]
					: [],
			columnFilters: buildColumnFilters(search, filterEntries),
		}),
		[search, filterEntries],
	);

	const hasActiveFilters = filterEntries.some(
		([, searchKey]) => search[searchKey] !== undefined,
	);

	return {
		state,
		onPaginationChange,
		onSortingChange,
		onColumnFiltersChange,
		hasActiveFilters,
		clearFilters,
		goToFirstPage,
	};
};
