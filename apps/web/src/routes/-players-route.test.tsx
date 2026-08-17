import { fireEvent, screen, waitFor } from "@testing-library/react";

import { renderRouteTree } from "@/test/render-route";
import { SAMPLE_PLAYERS, samplePlayersResponse } from "@/test/route-fixtures";

const renderPlayersRoute = (
	initialEntries: Array<string> = ["/players"],
): ReturnType<typeof renderRouteTree> => renderRouteTree(initialEntries);

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
		// Real timers: waitFor polls via a real setTimeout, and the 300ms
		// debounce is well under its default 1000ms timeout.
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

		// Mantine's Select popover doesn't reliably open under jsdom (no real
		// layout to position against), so this drives the param via the URL
		// instead — the click-to-open path is covered by real browser verification.
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
