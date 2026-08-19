import { Button, EmptyState, Stack, Title } from "@mantine/core";
import { Link } from "@tanstack/react-router";
import { type FC } from "react";

export const NotFound: FC = () => (
	<Stack p="xl">
		<Title order={1}>console-next</Title>
		<EmptyState
			title="Page not found"
			description="The page you're looking for doesn't exist."
		>
			<EmptyState.Actions>
				<Button component={Link} to="/">
					Go to homepage
				</Button>
			</EmptyState.Actions>
		</EmptyState>
	</Stack>
);
