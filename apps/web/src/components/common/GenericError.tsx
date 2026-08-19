import { Alert, Button, Group, Stack, Title } from "@mantine/core";
import { useQueryErrorResetBoundary } from "@tanstack/react-query";
import { type ErrorComponentProps, useRouter } from "@tanstack/react-router";
import { type FC, useCallback, useEffect } from "react";

interface GenericErrorProps extends Omit<ErrorComponentProps, "reset"> {
	title: string;
}

export const GenericError: FC<GenericErrorProps> = ({ error, title }) => {
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
			<Title order={1}>{title}</Title>
			<Alert color="red" title={`Could not load ${title.toLowerCase()}`}>
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
