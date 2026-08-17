import { QueryClientProvider } from "@tanstack/react-query";
import { createRouter, RouterProvider } from "@tanstack/react-router";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { API } from "@/lib/api/api-client";
import { queryClient } from "@/lib/query-client";

import { routeTree } from "./routeTree.gen";

import "@mantine/core/styles.css";
import "./index.css";

API.configure({
	endpoint: import.meta.env.VITE_API_URL ?? "http://localhost:4100",
});

// defaultPreload/defaultPreloadStaleTime deliberately unset — nothing to
// preload between with one route; add once a second route makes it testable.
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
