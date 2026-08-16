import { QueryClientProvider } from "@tanstack/react-query";
import { createRouter, RouterProvider } from "@tanstack/react-router";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { queryClient } from "@/lib/query-client";

import { routeTree } from "./routeTree.gen";

import "@mantine/core/styles.css";
import "./index.css";

// `defaultPreload`/`defaultPreloadStaleTime` are deliberately not set yet —
// with one route there is nothing to preload between, so neither would have
// observable behaviour to verify. Added with the second route, where the
// interaction with the API's rate limiter can also be tested for real.
const router = createRouter({ routeTree, context: { queryClient } });

declare module "@tanstack/react-router" {
	interface Register {
		router: typeof router;
	}
}

const rootElement = document.getElementById("root");
if (!rootElement) {
	throw new Error("Root element #root not found");
}

// QueryClientProvider must wrap RouterProvider, not sit inside __root's
// component: route loaders resolve before that tree renders.
createRoot(rootElement).render(
	<StrictMode>
		<QueryClientProvider client={queryClient}>
			<RouterProvider router={router} />
		</QueryClientProvider>
	</StrictMode>,
);
