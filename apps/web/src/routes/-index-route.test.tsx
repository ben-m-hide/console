import {
	createMemoryHistory,
	createRouter,
	RouterProvider,
} from "@tanstack/react-router";
import { render, screen, waitFor } from "@testing-library/react";
import type { FC } from "react";

import {
	createTestQueryClient,
	TestProviders,
} from "@/test/render-with-providers";

import { routeTree } from "../routeTree.gen";

const SAMPLE_COMPETITIONS = [
	{ id: 1, sportmonksId: 8, name: "Premier League", country: "England" },
];

// Drives the real route tree, not the page component directly, so the loader
// actually runs — that's what proves the query client reaches it via router
// context, invisible to a component-level test.
const renderRoute = (): ReturnType<typeof render> => {
	const queryClient = createTestQueryClient();
	const router = createRouter({
		routeTree,
		context: { queryClient },
		history: createMemoryHistory({ initialEntries: ["/"] }),
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
