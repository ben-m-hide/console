import {
	Button,
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
import { Fragment, useCallback, useEffect, useState } from "react";

import type { PlayerPosition } from "./-queries/players";
import { PLAYER_POSITIONS, playersQueryOptions } from "./-queries/players";

// getRouteApi avoids a circular import with players.tsx, which imports this component.
const routeApi = getRouteApi("/players");

const POSITION_SELECT_DATA = PLAYER_POSITIONS.map((position) => ({
	value: position,
	label: position,
}));

const SEARCH_DEBOUNCE_MS = 300;

export const PlayersPage: FC = () => {
	const search = routeApi.useSearch();
	const navigate = routeApi.useNavigate();

	// loaderDeps re-triggers and resolves the loader before a param change
	// re-renders this, so useSuspenseQuery always reads a warm cache — no flash.
	const { data: playersResponse } = useSuspenseQuery(
		playersQueryOptions(search),
	);
	const players = playersResponse.data;
	const meta = playersResponse.meta;

	const [searchDraft, setSearchDraft] = useState(search.search ?? "");

	// Syncs the draft with back/forward navigation, not just typing.
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

	const hasActiveFilters =
		search.search !== undefined || search.position !== undefined;
	// data can be empty either because the result set genuinely has zero rows,
	// or because the requested page is past the last page of a nonempty result
	// (the API has no upper bound on `page`) — these need different messaging.
	const isPageOutOfRange = players.length === 0 && meta.total > 0;

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
					data={POSITION_SELECT_DATA}
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
