import {
	createMemoryHistory,
	createRouter,
	RouterProvider,
} from "@tanstack/react-router";
import { render, screen, waitFor } from "@testing-library/react";
import type { ReactElement } from "react";

import {
	createTestQueryClient,
	TestProviders,
} from "@/test/render-with-providers";

import { routeTree } from "../routeTree.gen";

const SAMPLE_COMPETITIONS = [
	{ id: 1, sportmonksId: 8, name: "Premier League", country: "England" },
];

// Drives the real route tree rather than the page component directly, so the
// loader actually runs. That is the point: it proves the query client reaches
// the loader through router context, which is the whole subject of this change
// and is invisible to a component-level test.
const renderRoute = (): ReturnType<typeof render> => {
	const queryClient = createTestQueryClient();
	const router = createRouter({
		routeTree,
		context: { queryClient },
		history: createMemoryHistory({ initialEntries: ["/"] }),
	});

	// Mirrors main.tsx: the loader reaches the client through router context,
	// but useSuspenseQuery in the component reads it from React context — both
	// paths are required, and omitting the provider fails with
	// "No QueryClient set" even though the loader itself succeeded.
	const RoutedApp = (): ReactElement => (
		<TestProviders queryClient={queryClient}>
			<RouterProvider router={router} />
		</TestProviders>
	);
	return render(<RoutedApp />);
};

describe("index route", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("loads competitions via the route loader and renders them", async () => {
		const fetchMock = vi.fn().mockResolvedValue({
			ok: true,
			status: 200,
			json: async () => SAMPLE_COMPETITIONS,
		});
		vi.stubGlobal("fetch", fetchMock);

		renderRoute();

		await waitFor(() => {
			expect(screen.getByText(/Premier League/)).toBeInTheDocument();
		});
		// The loader awaits ensureQueryData, so the component reads from a warm
		// cache — one request, not a second one on mount.
		expect(fetchMock).toHaveBeenCalledTimes(1);
	});

	it("renders the route errorComponent when the request fails", async () => {
		vi.stubGlobal(
			"fetch",
			vi
				.fn()
				.mockResolvedValue({ ok: false, status: 500, json: async () => ({}) }),
		);

		renderRoute();

		await waitFor(() => {
			expect(
				screen.getByText("Could not load competitions"),
			).toBeInTheDocument();
		});
		expect(
			screen.getByRole("button", { name: "Try again" }),
		).toBeInTheDocument();
	});
});
