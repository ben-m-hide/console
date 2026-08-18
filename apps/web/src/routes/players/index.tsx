import { createFileRoute } from "@tanstack/react-router";

import { GenericError } from "@/components/common/GenericError";
import { GenericPending } from "@/components/common/GenericPending";
import { PlayersList } from "@/components/pages/players/PlayersList";
import { playersListQueryOptions } from "@/queries/players/players";
import { PlayersSearchSchema } from "@/routing/player";

export const Route = createFileRoute("/players/")({
	validateSearch: PlayersSearchSchema,
	loaderDeps: ({ search: routeSearch }) => ({
		page: routeSearch.page,
		pageSize: routeSearch.pageSize,
		search: routeSearch.search,
		position: routeSearch.position,
	}),
	loader: ({ context: { queryClient }, deps }) =>
		queryClient.ensureQueryData(playersListQueryOptions(deps)),
	component: PlayersList,
	pendingComponent: () => <GenericPending title="Players" />,
	errorComponent: ({ error }) => <GenericError error={error} title="Players" />,
});
