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

	// Without resetting Query's error boundary, a retry re-throws the cached
	// error immediately and the button appears permanently broken.
	useEffect(() => {
		reset();
	}, [reset]);

	// invalidate() re-runs the loader; if it fails again the loader throws and
	// this same errorComponent re-renders, so there is nothing extra to handle
	// here — but the promise is awaited rather than dropped so a rejection
	// can't surface as an unhandled one.
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
