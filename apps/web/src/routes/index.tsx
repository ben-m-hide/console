import { createFileRoute } from "@tanstack/react-router";

import { CompetitionsList } from "@/components/pages/competitions/CompetitionsList";

import { CompetitionsError, CompetitionsPending } from "./-index-page-states";
import { competitionsQueryOptions } from "./-queries/competitions";

export const Route = createFileRoute("/")({
	loader: ({ context: { queryClient } }) =>
		queryClient.ensureQueryData(competitionsQueryOptions),
	component: CompetitionsList,
	pendingComponent: CompetitionsPending,
	errorComponent: CompetitionsError,
});
