import { List, Stack, Title } from "@mantine/core";
import { useSuspenseQuery } from "@tanstack/react-query";
import type { ReactElement } from "react";

import { competitionsQueryOptions } from "./-queries/competitions";

// The route loader has already resolved this query, so useSuspenseQuery reads
// it straight from the cache on first render — no loading flash, no waterfall.
// Loading and error states live in the route's pendingComponent/errorComponent.
export const IndexPage = (): ReactElement => {
	const { data: competitions } = useSuspenseQuery(competitionsQueryOptions);

	return (
		<Stack p="xl">
			<Title order={1}>Competitions</Title>
			<List>
				{competitions.map((competition) => (
					<List.Item key={competition.id}>
						{competition.name} — {competition.country}
					</List.Item>
				))}
			</List>
		</Stack>
	);
};
