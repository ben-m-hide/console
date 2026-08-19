import { MantineProvider } from "@mantine/core";
import { QueryClientProvider } from "@tanstack/react-query";
import { createRouter, RouterProvider } from "@tanstack/react-router";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { queryClient, theme } from "@/lib";
import { API } from "@/lib/api";

import { routeTree } from "./routeTree.gen";

import "@mantine/core/styles.css";
import "@mantine/dates/styles.css";
import "mantine-react-table/styles.css";
import "./index.css";

declare module "@tanstack/react-router" {
	interface Register {
		router: typeof router;
	}
}

API.configure({
	endpoint: import.meta.env.VITE_API_URL ?? "http://localhost:4100",
});

const rootElement = document.getElementById("root");
if (!rootElement) {
	throw new Error("Root element #root not found");
}

const router = createRouter({
	routeTree,
	context: { queryClient },
	scrollRestoration: true,
});
createRoot(rootElement).render(
	<StrictMode>
		<QueryClientProvider client={queryClient}>
			<MantineProvider theme={theme} defaultColorScheme="auto">
				<RouterProvider router={router} />
			</MantineProvider>
		</QueryClientProvider>
	</StrictMode>,
);
