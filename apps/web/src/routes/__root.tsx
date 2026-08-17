import { MantineProvider } from "@mantine/core";
import { TanStackDevtools } from "@tanstack/react-devtools";
import { FormDevtoolsPanel } from "@tanstack/react-form-devtools";
import type { QueryClient } from "@tanstack/react-query";
import { ReactQueryDevtoolsPanel } from "@tanstack/react-query-devtools";
import { createRootRouteWithContext, Outlet } from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import type { FC } from "react";

import { theme } from "@/lib/theme";

interface RouterContext {
	queryClient: QueryClient;
}

// QueryClientProvider lives in main.tsx, not here: loaders run before this
// tree renders, so a provider mounted here is out of scope for every loader.
// Checked against MODE not DEV: Vitest also reports DEV === true, and the
// devtools throw "Devtools is not mounted" on teardown under jsdom.
const isDevelopment = import.meta.env.MODE === "development";

const RootComponent: FC = () => (
	<MantineProvider theme={theme} defaultColorScheme="auto">
		<Outlet />
		{isDevelopment ? (
			<TanStackDevtools
				plugins={[
					{ name: "TanStack Query", render: <ReactQueryDevtoolsPanel /> },
					{ name: "TanStack Router", render: <TanStackRouterDevtoolsPanel /> },
					{ name: "TanStack Form", render: <FormDevtoolsPanel /> },
				]}
			/>
		) : null}
	</MantineProvider>
);

export const Route = createRootRouteWithContext<RouterContext>()({
	component: RootComponent,
});
