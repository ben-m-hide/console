import { MantineProvider } from "@mantine/core";
import { TanStackDevtools } from "@tanstack/react-devtools";
import { FormDevtoolsPanel } from "@tanstack/react-form-devtools";
import type { QueryClient } from "@tanstack/react-query";
import { ReactQueryDevtoolsPanel } from "@tanstack/react-query-devtools";
import { createRootRouteWithContext, Outlet } from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import type { ReactElement } from "react";

import { theme } from "@/lib/theme";

interface RouterContext {
	queryClient: QueryClient;
}

// QueryClientProvider deliberately lives in main.tsx, outside RouterProvider,
// not here: loaders run before this component tree renders, so a provider
// mounted here would be out of scope for every route loader.
// Dev only, checked against MODE rather than DEV: Vitest also reports
// DEV === true, and the devtools throw "Devtools is not mounted" on teardown
// under jsdom, which fails any test that renders the real route tree. Keeping
// them out of the production bundle is the right default regardless.
const isDevelopment = import.meta.env.MODE === "development";

const RootComponent = (): ReactElement => (
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
