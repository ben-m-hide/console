import {
	Button,
	type ComboboxData,
	EmptyState,
	Group,
	Pagination,
	Select,
	Stack,
	Table,
	Text,
	TextInput,
	Title,
} from "@mantine/core";
import { useSuspenseQuery } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";
import type { ChangeEvent, FC } from "react";
import { Fragment, useCallback, useEffect, useMemo, useState } from "react";

import { playersListQueryOptions } from "@/queries";
import { PlayerPosition } from "@/types";

const routeApi = getRouteApi("/players/");

const SEARCH_DEBOUNCE_MS = 300;

export const PlayersList: FC = () => {
	const search = routeApi.useSearch();
	const navigate = routeApi.useNavigate();

	const { data: playersResponse } = useSuspenseQuery(
		playersListQueryOptions(search),
	);
	const players = playersResponse.data;
	const meta = playersResponse.meta;

	const [searchDraft, setSearchDraft] = useState(search.search ?? "");

	const playerPositionOptions = useMemo<ComboboxData<PlayerPosition>>(
		() =>
			Object.values(PlayerPosition).map((position) => ({
				value: position,
				label: position,
			})),
		[],
	);

	// Syncs the draft with back/forward navigation.
	useEffect(() => {
		setSearchDraft(search.search ?? "");
	}, [search.search]);

	useEffect(() => {
		const trimmedDraft = searchDraft.trim();
		const nextSearch = trimmedDraft === "" ? undefined : trimmedDraft;
		if (nextSearch === search.search) {
			return;
		}

		const timeoutId = setTimeout(async () => {
			await navigate({
				search: (previous) => ({ ...previous, search: nextSearch, page: 1 }),
			});
		}, SEARCH_DEBOUNCE_MS);

		return (): void => clearTimeout(timeoutId);
	}, [searchDraft, search.search, navigate]);

	const handleSearchChange = useCallback(
		(event: ChangeEvent<HTMLInputElement>): void => {
			setSearchDraft(event.currentTarget.value);
		},
		[],
	);

	const handlePositionChange = useCallback(
		async (value: string | null): Promise<void> => {
			await navigate({
				search: (previous) => ({
					...previous,
					position: value === null ? undefined : (value as PlayerPosition),
					page: 1,
				}),
			});
		},
		[navigate],
	);

	const handlePageChange = useCallback(
		async (page: number): Promise<void> => {
			await navigate({ search: (previous) => ({ ...previous, page }) });
		},
		[navigate],
	);

	const handleClearFilters = useCallback(async (): Promise<void> => {
		await navigate({
			search: (previous) => ({
				...previous,
				search: undefined,
				position: undefined,
				page: 1,
			}),
		});
	}, [navigate]);

	const handleGoToFirstPage = useCallback(async (): Promise<void> => {
		await navigate({ search: (previous) => ({ ...previous, page: 1 }) });
	}, [navigate]);

	const hasActiveFilters =
		search.search !== undefined || search.position !== undefined;
	const isPageOutOfRange = players.length === 0 && meta.total > 0;

	return (
		<Stack p="xl">
			<Title order={1}>Players</Title>
			<Group>
				<TextInput
					aria-label="Search players by name"
					placeholder="Search by name"
					value={searchDraft}
					onChange={handleSearchChange}
				/>
				<Select
					aria-label="Filter by position"
					placeholder="All positions"
					data={playerPositionOptions}
					value={search.position ?? null}
					onChange={handlePositionChange}
					clearable
				/>
			</Group>
			{players.length === 0 ? (
				<EmptyState
					title={isPageOutOfRange ? "Page not found" : "No players found"}
					description={
						isPageOutOfRange
							? `Page ${String(search.page)} is past the last page of results.`
							: hasActiveFilters
								? "No players match the current search and filters."
								: "No players are available."
					}
				>
					{isPageOutOfRange ? (
						<EmptyState.Actions>
							<Button onClick={handleGoToFirstPage}>Go to first page</Button>
						</EmptyState.Actions>
					) : hasActiveFilters ? (
						<EmptyState.Actions>
							<Button onClick={handleClearFilters}>Clear filters</Button>
						</EmptyState.Actions>
					) : null}
				</EmptyState>
			) : (
				<Fragment>
					<Table>
						<Table.Thead>
							<Table.Tr>
								<Table.Th>Name</Table.Th>
								<Table.Th>Position</Table.Th>
								<Table.Th>Nationality</Table.Th>
								<Table.Th>Date of birth</Table.Th>
							</Table.Tr>
						</Table.Thead>
						<Table.Tbody>
							{players.map((player) => (
								<Table.Tr key={player.id}>
									<Table.Td>{player.name}</Table.Td>
									<Table.Td>{player.position}</Table.Td>
									<Table.Td>{player.nationality}</Table.Td>
									<Table.Td>{player.dateOfBirth}</Table.Td>
								</Table.Tr>
							))}
						</Table.Tbody>
					</Table>
					<Group justify="space-between">
						<Text size="sm" c="dimmed">
							{meta.total} players
						</Text>
						<Pagination
							total={meta.totalPages}
							value={meta.page}
							onChange={handlePageChange}
						/>
					</Group>
				</Fragment>
			)}
		</Stack>
	);
};
