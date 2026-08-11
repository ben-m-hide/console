import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { createRootRoute, Outlet } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import type { ReactElement } from "react";

import { queryClient } from "@/lib/query-client";

const RootComponent = (): ReactElement => (
	<QueryClientProvider client={queryClient}>
		<Outlet />
		<TanStackRouterDevtools />
		<ReactQueryDevtools />
	</QueryClientProvider>
);

export const Route = createRootRoute({
	component: RootComponent,
});
