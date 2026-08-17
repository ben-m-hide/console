import { Alert, Button, Group, Loader, Stack, Title } from "@mantine/core";
import { useQueryErrorResetBoundary } from "@tanstack/react-query";
import type { ErrorComponentProps } from "@tanstack/react-router";
import { useRouter } from "@tanstack/react-router";
import type { ReactElement } from "react";
import { useCallback, useEffect } from "react";

export const PlayersPending = (): ReactElement => (
	<Stack p="xl">
		<Title order={1}>Players</Title>
		<Loader aria-label="Loading players" />
	</Stack>
);

export const PlayersError = ({ error }: ErrorComponentProps): ReactElement => {
	const router = useRouter();
	const { reset } = useQueryErrorResetBoundary();

	useEffect(() => {
		reset();
	}, [reset]);

	const handleRetry = useCallback(async (): Promise<void> => {
		await router.invalidate();
	}, [router]);

	return (
		<Stack p="xl">
			<Title order={1}>Players</Title>
			<Alert color="red" title="Could not load players">
				{error.message}
			</Alert>
			<Group>
				<Button w="fit-content" onClick={handleRetry}>
					Try again
				</Button>
			</Group>
		</Stack>
	);
};
