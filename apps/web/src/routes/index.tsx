import { createFileRoute } from "@tanstack/react-router";

import { GenericError } from "@/components/common/GenericError";
import { GenericPending } from "@/components/common/GenericPending";
import { CompetitionsList } from "@/components/pages/competitions/CompetitionsList";
import { competitionsListQueryOptions } from "@/queries/competitions/competitions";

export const Route = createFileRoute("/")({
	loader: ({ context: { queryClient } }) =>
		queryClient.ensureQueryData(competitionsListQueryOptions()),
	component: CompetitionsList,
	pendingComponent: () => <GenericPending title="Competitions" />,
	errorComponent: ({ error }) => (
		<GenericError error={error} title="Competitions" />
	),
});
