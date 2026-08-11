import { Button, Stack, Title } from "@mantine/core";
import type { ReactElement } from "react";

export const IndexPage = (): ReactElement => (
	<Stack p="xl">
		<Title order={1}>console-next</Title>
		<Button w="fit-content">It works</Button>
	</Stack>
);
