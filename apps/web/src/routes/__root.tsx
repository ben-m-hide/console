import { MantineProvider } from "@mantine/core";
import { TanStackDevtools } from "@tanstack/react-devtools";
import { FormDevtoolsPanel } from "@tanstack/react-form-devtools";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtoolsPanel } from "@tanstack/react-query-devtools";
import { createRootRoute, Outlet } from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import type { ReactElement } from "react";

import { queryClient } from "@/lib/query-client";
import { theme } from "@/lib/theme";

const RootComponent = (): ReactElement => (
	<MantineProvider theme={theme} defaultColorScheme="auto">
		<QueryClientProvider client={queryClient}>
			<Outlet />
			<TanStackDevtools
				plugins={[
					{ name: "TanStack Query", render: <ReactQueryDevtoolsPanel /> },
					{ name: "TanStack Router", render: <TanStackRouterDevtoolsPanel /> },
					{ name: "TanStack Form", render: <FormDevtoolsPanel /> },
				]}
			/>
		</QueryClientProvider>
	</MantineProvider>
);

export const Route = createRootRoute({
	component: RootComponent,
});
