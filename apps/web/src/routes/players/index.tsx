import { createFileRoute } from "@tanstack/react-router";

import { GenericError } from "@/components/common/GenericError";
import { GenericPending } from "@/components/common/GenericPending";
import { PlayersList } from "@/components/pages/players/PlayersList";
import { playersListQueryOptions } from "@/queries";
import { PlayersSearchSchema } from "@/search-params";

export const Route = createFileRoute("/players/")({
	validateSearch: PlayersSearchSchema,
	loader: ({ context: { queryClient }, location }) =>
		queryClient.ensureQueryData(
			playersListQueryOptions(PlayersSearchSchema.parse(location.search)),
		),
	component: PlayersList,
	pendingComponent: () => <GenericPending title="Players" />,
	errorComponent: ({ error }) => <GenericError error={error} title="Players" />,
});
