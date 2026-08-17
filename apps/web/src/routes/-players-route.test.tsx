import {
	createMemoryHistory,
	createRouter,
	RouterProvider,
} from "@tanstack/react-router";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { FC } from "react";

import {
	createTestQueryClient,
	TestProviders,
} from "@/test/render-with-providers";

import { routeTree } from "../routeTree.gen";

const SAMPLE_PLAYERS = [
	{
		id: 1,
		sportmonksId: 101,
		name: "Erling Haaland",
		dateOfBirth: "2000-07-21",
		nationality: "Norway",
		position: "Attacker",
	},
	{
		id: 2,
		sportmonksId: 102,
		name: "Alisson Becker",
		dateOfBirth: "1992-10-02",
		nationality: "Brazil",
		position: "Goalkeeper",
	},
];

interface SamplePlayersResponse {
	data: Array<unknown>;
	meta: { page: number; pageSize: number; total: number; totalPages: number };
}

const samplePlayersResponse = (
	players: Array<unknown>,
	total: number,
): SamplePlayersResponse => ({
	data: players,
	meta: { page: 1, pageSize: 25, total, totalPages: Math.ceil(total / 25) },
});

// Drives the real route tree, same rationale as -index-route.test.tsx: this
// is the only way loaderDeps/loader/validateSearch and the loader-vs-component
// data path are actually exercised, and it's the only render path that gives
// getRouteApi("/players") a matched route to read from.
const renderPlayersRoute = (
	initialEntries: Array<string> = ["/players"],
): ReturnType<typeof render> => {
	const queryClient = createTestQueryClient();
	const router = createRouter({
		routeTree,
		context: { queryClient },
		history: createMemoryHistory({ initialEntries }),
	});

	const RoutedApp: FC = () => (
		<TestProviders queryClient={queryClient}>
			<RouterProvider router={router} />
		</TestProviders>
	);
	return render(<RoutedApp />);
};

describe("players route", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
		vi.useRealTimers();
	});

	it("loads players via the route loader and renders them", async () => {
		const fetchMock = vi.fn().mockResolvedValue({
			ok: true,
			status: 200,
			json: async () => samplePlayersResponse(SAMPLE_PLAYERS, 2),
		});
		vi.stubGlobal("fetch", fetchMock);

		renderPlayersRoute();

		await waitFor(() => {
			expect(screen.getByText("Erling Haaland")).toBeInTheDocument();
		});
		expect(screen.getByText("Alisson Becker")).toBeInTheDocument();
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

		renderPlayersRoute();

		await waitFor(() => {
			expect(screen.getByText("Could not load players")).toBeInTheDocument();
		});
		expect(
			screen.getByRole("button", { name: "Try again" }),
		).toBeInTheDocument();
	});

	it("renders an empty state when the result set is genuinely empty", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue({
				ok: true,
				status: 200,
				json: async () => samplePlayersResponse([], 0),
			}),
		);

		renderPlayersRoute();

		await waitFor(() => {
			expect(screen.getByText("No players found")).toBeInTheDocument();
		});
		expect(screen.getByText("No players are available.")).toBeInTheDocument();
	});

	it("renders a page-out-of-range state distinct from a genuinely empty result", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue({
				ok: true,
				status: 200,
				json: async () => samplePlayersResponse([], 1991),
			}),
		);

		renderPlayersRoute(["/players?page=999"]);

		await waitFor(() => {
			expect(screen.getByText("Page not found")).toBeInTheDocument();
		});
		expect(
			screen.getByRole("button", { name: "Go to first page" }),
		).toBeInTheDocument();
	});

	it("debounces search input before navigating and refetching", async () => {
		// Real timers throughout: testing-library's waitFor polls via a real
		// setTimeout internally, which fake timers would need to be manually
		// driven past too — real time is simpler here since the debounce
		// (300ms) is well under waitFor's default 1000ms timeout.
		const fetchMock = vi.fn().mockResolvedValue({
			ok: true,
			status: 200,
			json: async () => samplePlayersResponse(SAMPLE_PLAYERS, 2),
		});
		vi.stubGlobal("fetch", fetchMock);

		renderPlayersRoute();
		await waitFor(() => {
			expect(screen.getByText("Erling Haaland")).toBeInTheDocument();
		});
		expect(fetchMock).toHaveBeenCalledTimes(1);

		fireEvent.change(screen.getByLabelText("Search players by name"), {
			target: { value: "Haaland" },
		});

		// Not yet — the debounce hasn't elapsed.
		expect(fetchMock).toHaveBeenCalledTimes(1);

		await waitFor(() => {
			expect(fetchMock).toHaveBeenCalledTimes(2);
		});
		const requestedUrl = (fetchMock.mock.calls.at(-1) as [string])[0];
		expect(requestedUrl).toContain("search=Haaland");
		expect(requestedUrl).toContain("page=1");
	});

	it("requests the position param from the URL and reflects it in the filter", async () => {
		const fetchMock = vi.fn().mockResolvedValue({
			ok: true,
			status: 200,
			json: async () => samplePlayersResponse(SAMPLE_PLAYERS, 2),
		});
		vi.stubGlobal("fetch", fetchMock);

		// Mantine's Select opens its options through a Combobox/Popover that
		// doesn't reliably open under jsdom's mouse/pointer event simulation —
		// no real layout to position against. Driving the param via the URL
		// instead still exercises validateSearch parsing, loaderDeps, and the
		// query wiring; the actual click-to-open interaction is checked in real
		// browser verification per the plan.
		renderPlayersRoute(["/players?position=Goalkeeper"]);

		await waitFor(() => {
			expect(fetchMock).toHaveBeenCalledTimes(1);
		});
		const requestedUrl = (fetchMock.mock.calls.at(-1) as [string])[0];
		expect(requestedUrl).toContain("position=Goalkeeper");

		expect(
			screen.getByRole("combobox", { name: "Filter by position" }),
		).toHaveValue("Goalkeeper");
	});

	it("refetches the requested page when pagination changes", async () => {
		const fetchMock = vi.fn().mockResolvedValue({
			ok: true,
			status: 200,
			json: async () =>
				samplePlayersResponse(SAMPLE_PLAYERS, SAMPLE_PLAYERS.length * 30),
		});
		vi.stubGlobal("fetch", fetchMock);

		renderPlayersRoute();
		await waitFor(() => {
			expect(screen.getByText("Erling Haaland")).toBeInTheDocument();
		});

		fireEvent.click(screen.getByRole("button", { name: "2" }));

		await waitFor(() => {
			expect(fetchMock).toHaveBeenCalledTimes(2);
		});
		const requestedUrl = (fetchMock.mock.calls.at(-1) as [string])[0];
		expect(requestedUrl).toContain("page=2");
	});
});
