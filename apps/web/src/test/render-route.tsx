import {
	createMemoryHistory,
	createRouter,
	RouterProvider,
} from "@tanstack/react-router";
import { render } from "@testing-library/react";
import { type FC } from "react";

import { routeTree } from "@/routeTree.gen";

import { createTestQueryClient, TestProviders } from "./render-with-providers";

// Drives the real route tree, not a page component directly, so the loader
// actually runs and getRouteApi(...) has a matched route to read from —
// neither is exercised by a component-level test.
export const renderRouteTree = (
	initialEntries: Array<string>,
): ReturnType<typeof render> => {
	const queryClient = createTestQueryClient();
	const router = createRouter({
		routeTree,
		context: { queryClient },
		history: createMemoryHistory({ initialEntries }),
	});

	// Both providers are required: the loader reads the client from router
	// context, useSuspenseQuery from React context.
	const RoutedApp: FC = () => (
		<TestProviders queryClient={queryClient}>
			<RouterProvider router={router} />
		</TestProviders>
	);
	return render(<RoutedApp />);
};
