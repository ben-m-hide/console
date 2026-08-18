import { createFileRoute } from "@tanstack/react-router";

import { PlayersList } from "@/components/pages/players/PlayersList";

import { PlayersError, PlayersPending } from "../-players-page-states";
import { PlayersSearchSchema, playersQueryOptions } from "../-queries/players";

export const Route = createFileRoute("/players/")({
	validateSearch: PlayersSearchSchema,
	loaderDeps: ({ search: routeSearch }) => ({
		page: routeSearch.page,
		pageSize: routeSearch.pageSize,
		search: routeSearch.search,
		position: routeSearch.position,
	}),
	loader: ({ context: { queryClient }, deps }) =>
		queryClient.ensureQueryData(playersQueryOptions(deps)),
	component: PlayersList,
	pendingComponent: PlayersPending,
	errorComponent: PlayersError,
});
