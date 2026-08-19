import { MantineProvider } from "@mantine/core";
import {
	createMemoryHistory,
	createRootRoute,
	createRouter,
	RouterProvider,
} from "@tanstack/react-router";
import { render, waitFor } from "@testing-library/react";

import { NotFound } from "./NotFound";

// A minimal single-route router, not the real routeTree — NotFound is
// rendered as a route component (needs router context for its Link), but
// this test is scoped to the component itself, not app-wide routing.
const renderNotFound = (): ReturnType<typeof render> => {
	const rootRoute = createRootRoute({ component: NotFound });
	const router = createRouter({
		routeTree: rootRoute,
		history: createMemoryHistory({ initialEntries: ["/"] }),
	});
	return render(
		<MantineProvider>
			<RouterProvider router={router} />
		</MantineProvider>,
	);
};

describe("NotFound", () => {
	it("renders a not-found message", async () => {
		const { getByText } = renderNotFound();

		await waitFor(() => {
			expect(getByText("Page not found")).toBeInTheDocument();
		});
	});

	it("links back to the homepage", async () => {
		const { getByRole } = renderNotFound();

		await waitFor(() => {
			expect(getByRole("link", { name: "Go to homepage" })).toHaveAttribute(
				"href",
				"/",
			);
		});
	});
});
