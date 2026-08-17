import { Alert, Button, Group, Loader, Stack, Title } from "@mantine/core";
import { useQueryErrorResetBoundary } from "@tanstack/react-query";
import type { ErrorComponentProps } from "@tanstack/react-router";
import { useRouter } from "@tanstack/react-router";
import type { FC } from "react";
import { useCallback, useEffect } from "react";

export const CompetitionsPending: FC = () => (
	<Stack p="xl">
		<Title order={1}>Competitions</Title>
		<Loader aria-label="Loading competitions" />
	</Stack>
);

export const CompetitionsError: FC<ErrorComponentProps> = ({ error }) => {
	const router = useRouter();
	const { reset } = useQueryErrorResetBoundary();

	// Without this, a retry re-throws the cached error immediately.
	useEffect(() => {
		reset();
	}, [reset]);

	// Awaited, not dropped, so a rejection can't surface as unhandled — a
	// second failure re-throws from the loader and this component re-renders.
	const handleRetry = useCallback(async (): Promise<void> => {
		await router.invalidate();
	}, [router]);

	return (
		<Stack p="xl">
			<Title order={1}>Competitions</Title>
			<Alert color="red" title="Could not load competitions">
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
