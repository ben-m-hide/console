import { type QueryClient } from "@tanstack/react-query";
import { createRootRouteWithContext, Outlet } from "@tanstack/react-router";
import { type FC, Fragment } from "react";

import { Devtools } from "@/components/common/DevTools";
import { GenericError } from "@/components/common/GenericError";
import { NotFound } from "@/components/common/NotFound";
import { isDev } from "@/config";

interface RouterContext {
	queryClient: QueryClient;
}

const RootComponent: FC = () => (
	<Fragment>
		<Outlet />
		{isDev() ? <Devtools /> : null}
	</Fragment>
);

export const Route = createRootRouteWithContext<RouterContext>()({
	component: RootComponent,
	notFoundComponent: NotFound,
	errorComponent: ({ error }) => (
		<GenericError error={error} title="console-next" />
	),
});
