import { type Player } from "@console-next/shared";
import { type ComboboxData, Stack, Title } from "@mantine/core";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";
import { type FC, useCallback, useMemo } from "react";

import {
	type ColumnDef,
	DataTable,
} from "@/components/common/DataTable/DataTable";
import { GenericPending } from "@/components/common/GenericPending";
import { playersListQueryOptions } from "@/queries";
import { PlayerPosition } from "@/types";

const routeApi = getRouteApi("/players/");

export const PlayersList: FC = () => {
	const search = routeApi.useSearch();
	const navigate = routeApi.useNavigate();

	const { data: playersResponse, isFetching } = useQuery({
		...playersListQueryOptions(search),
		placeholderData: keepPreviousData,
	});

	const setSearch = useCallback(
		async (
			updater: (previous: typeof search) => typeof search,
		): Promise<void> => {
			await navigate({ search: updater });
		},
		[navigate],
	);

	const playerPositionOptions = useMemo<ComboboxData<PlayerPosition>>(
		() =>
			Object.values(PlayerPosition).map((position) => ({
				value: position,
				label: position,
			})),
		[],
	);

	const columns = useMemo<Array<ColumnDef<Player>>>(
		() => [
			{ accessorKey: "name", header: "Name", filterVariant: "text" },
			{
				accessorKey: "position",
				header: "Position",
				filterVariant: "select",
				mantineFilterSelectProps: {
					data: playerPositionOptions,
					clearable: true,
				},
			},
			{
				accessorKey: "nationality",
				header: "Nationality",
				enableColumnFilter: false,
			},
			{
				accessorKey: "dateOfBirth",
				header: "Date of birth",
				enableColumnFilter: false,
			},
		],
		[playerPositionOptions],
	);

	// Column id -> search param name.
	const filterFields = useMemo(
		() => ({ name: "search", position: "position" }) as const,
		[],
	);

	// Reachable on SPA navigation into a search-param combo the route loader
	// never warmed for this exact query key — not an impossible-scenario guard.
	if (playersResponse === undefined) {
		return <GenericPending title="Players" />;
	}

	return (
		<Stack p="xl">
			<Title order={1}>Players</Title>
			<DataTable
				columns={columns}
				data={playersResponse.data}
				meta={playersResponse.meta}
				search={search}
				setSearch={setSearch}
				filterFields={filterFields}
				entityNamePlural="players"
				isFetching={isFetching}
				enableGlobalFilter={false}
				enableHiding={false}
				enableMultiSort={false}
				enableStickyHeader
				mantinePaginationProps={{ showRowsPerPage: false }}
				initialState={{ showColumnFilters: true }}
			/>
		</Stack>
	);
};
