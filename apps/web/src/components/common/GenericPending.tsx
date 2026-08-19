import { Loader, Stack, Title } from "@mantine/core";
import { type FC } from "react";

interface GenericPendingProps {
	title: string;
}

export const GenericPending: FC<GenericPendingProps> = ({ title }) => (
	<Stack p="xl">
		<Title order={1}>{title}</Title>
		<Loader aria-label={`Loading ${title.toLowerCase()}...`} />
	</Stack>
);
