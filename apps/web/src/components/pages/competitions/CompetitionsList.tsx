import { List, Stack, Title } from "@mantine/core";
import { useSuspenseQuery } from "@tanstack/react-query";
import type { FC } from "react";

import { competitionsListQueryOptions } from "@/queries/competitions/competitions";

export const CompetitionsList: FC = () => {
	const { data: competitionsResponse } = useSuspenseQuery(
		competitionsListQueryOptions(),
	);
	const competitions = competitionsResponse.data;

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
