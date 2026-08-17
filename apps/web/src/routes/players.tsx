import { createFileRoute } from "@tanstack/react-router";

import { PlayersPage } from "./-players-page";
import { PlayersError, PlayersPending } from "./-players-page-states";
import { PlayersSearchSchema, playersQueryOptions } from "./-queries/players";

export const Route = createFileRoute("/players")({
	validateSearch: PlayersSearchSchema,
	// Renamed to avoid a search.search collision — the outer object is the
	// route's search params, one of which is itself the text-search field.
	loaderDeps: ({ search: routeSearch }) => ({
		page: routeSearch.page,
		pageSize: routeSearch.pageSize,
		search: routeSearch.search,
		position: routeSearch.position,
	}),
	loader: ({ context: { queryClient }, deps }) =>
		queryClient.ensureQueryData(playersQueryOptions(deps)),
	component: PlayersPage,
	pendingComponent: PlayersPending,
	errorComponent: PlayersError,
});
