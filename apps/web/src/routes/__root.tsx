import { MantineProvider } from "@mantine/core";
import type { QueryClient } from "@tanstack/react-query";
import { createRootRouteWithContext, Outlet } from "@tanstack/react-router";
import type { FC } from "react";

import { Devtools } from "@/components/common/DevTools";
import { isDev } from "@/config";
import { theme } from "@/lib";

interface RouterContext {
	queryClient: QueryClient;
}

// QueryClientProvider lives in main.tsx, not here: loaders run before this
// tree renders, so a provider mounted here is out of scope for every loader.
const RootComponent: FC = () => (
	<MantineProvider theme={theme} defaultColorScheme="auto">
		<Outlet />
		{isDev() ? <Devtools /> : null}
	</MantineProvider>
);

export const Route = createRootRouteWithContext<RouterContext>()({
	component: RootComponent,
});
