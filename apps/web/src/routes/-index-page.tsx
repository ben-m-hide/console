import type { Competition } from "@console-next/shared";
import { CompetitionSchema } from "@console-next/shared";
import { Alert, List, Loader, Stack, Title } from "@mantine/core";
import { useQuery } from "@tanstack/react-query";
import type { ReactElement } from "react";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4100";

const fetchCompetitions = async (): Promise<Array<Competition>> => {
	const response = await fetch(`${API_URL}/api/v1/competitions`);
	if (!response.ok) {
		throw new Error(`Request failed: ${response.status}`);
	}

	const parsed = CompetitionSchema.array().safeParse(await response.json());
	if (!parsed.success) {
		throw new Error("Response did not match the expected schema");
	}
	return parsed.data;
};

export const IndexPage = (): ReactElement => {
	const { data, isPending, isError, error } = useQuery({
		queryKey: ["competitions"],
		queryFn: fetchCompetitions,
	});

	return (
		<Stack p="xl">
			<Title order={1}>Competitions</Title>
			{isPending ? <Loader aria-label="Loading competitions" /> : null}
			{isError ? (
				<Alert color="red" title="Could not load competitions">
					{error.message}
				</Alert>
			) : null}
			{data ? (
				<List>
					{data.map((competition) => (
						<List.Item key={competition.id}>
							{competition.name} — {competition.country}
						</List.Item>
					))}
				</List>
			) : null}
		</Stack>
	);
};
