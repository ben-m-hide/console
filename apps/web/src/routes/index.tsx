import { createFileRoute } from "@tanstack/react-router";

import { IndexPage } from "./-index-page";
import { CompetitionsError, CompetitionsPending } from "./-index-page-states";
import { competitionsQueryOptions } from "./-queries/competitions";

export const Route = createFileRoute("/")({
	loader: ({ context: { queryClient } }) =>
		queryClient.ensureQueryData(competitionsQueryOptions),
	component: IndexPage,
	pendingComponent: CompetitionsPending,
	errorComponent: CompetitionsError,
});
