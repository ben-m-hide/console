import { fireEvent, waitFor } from "@testing-library/react";

import { samplePlayersResponse } from "@/test/data/route-fixtures";
import { SAMPLE_PLAYERS } from "@/test/data/sample-data";
import { renderRouteTree } from "@/test/render-route";

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

		const { getByText } = renderPlayersRoute();

		await waitFor(() => {
			expect(getByText("Erling Haaland")).toBeInTheDocument();
		});
		expect(getByText("Alisson Becker")).toBeInTheDocument();
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

		const { getByText, getByRole } = renderPlayersRoute();

		await waitFor(() => {
			expect(getByText("Could not load players")).toBeInTheDocument();
		});
		expect(getByRole("button", { name: "Try again" })).toBeInTheDocument();
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

		const { getByText } = renderPlayersRoute();

		await waitFor(() => {
			expect(getByText("No players found")).toBeInTheDocument();
		});
		expect(getByText("No players are available.")).toBeInTheDocument();
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

		const { getByText, getByRole } = renderPlayersRoute(["/players?page=999"]);

		await waitFor(() => {
			expect(getByText("Page not found")).toBeInTheDocument();
		});
		expect(
			getByRole("button", { name: "Go to first page" }),
		).toBeInTheDocument();
	});

	it("requests the search param from the URL", async () => {
		const fetchMock = vi.fn().mockResolvedValue({
			ok: true,
			status: 200,
			json: async () => samplePlayersResponse(SAMPLE_PLAYERS, 2),
		});
		vi.stubGlobal("fetch", fetchMock);

		// MRT's column-filter Collapse relies on real layout measurement to
		// animate open, which jsdom doesn't provide (intermittently renders
		// filter inputs `inert`/hidden depending on run order) — same class of
		// issue as Mantine's own Select popover below. Drives the param via
		// the URL instead; typing + MRT's own internal debounce (400ms in
		// manual-filtering mode) is covered by real browser verification.
		renderPlayersRoute(["/players?search=Haaland"]);

		await waitFor(() => {
			expect(fetchMock).toHaveBeenCalledTimes(1);
		});
		const requestedUrl = (fetchMock.mock.calls.at(-1) as [string])[0];
		expect(requestedUrl).toContain("search=Haaland");
	});

	it("requests the position param from the URL", async () => {
		const fetchMock = vi.fn().mockResolvedValue({
			ok: true,
			status: 200,
			json: async () => samplePlayersResponse(SAMPLE_PLAYERS, 2),
		});
		vi.stubGlobal("fetch", fetchMock);

		// MRT's column-filter Collapse relies on real layout measurement to
		// animate open, which jsdom doesn't provide — same class of issue as
		// Mantine's own Select popover. Drives the param via the URL instead;
		// the click-to-open path is covered by real browser verification.
		renderPlayersRoute(["/players?position=Goalkeeper"]);

		await waitFor(() => {
			expect(fetchMock).toHaveBeenCalledTimes(1);
		});
		const requestedUrl = (fetchMock.mock.calls.at(-1) as [string])[0];
		expect(requestedUrl).toContain("position=Goalkeeper");
	});

	it("refetches the requested page when pagination changes", async () => {
		const fetchMock = vi.fn().mockResolvedValue({
			ok: true,
			status: 200,
			json: async () =>
				samplePlayersResponse(SAMPLE_PLAYERS, SAMPLE_PLAYERS.length * 30),
		});
		vi.stubGlobal("fetch", fetchMock);

		const { getByText, getByRole } = renderPlayersRoute();
		await waitFor(() => {
			expect(getByText("Erling Haaland")).toBeInTheDocument();
		});

		fireEvent.click(getByRole("button", { name: "2" }));

		await waitFor(() => {
			expect(fetchMock).toHaveBeenCalledTimes(2);
		});
		const requestedUrl = (fetchMock.mock.calls.at(-1) as [string])[0];
		expect(requestedUrl).toContain("page=2");
	});

	it("refetches with the requested sort when a column header is clicked", async () => {
		const fetchMock = vi.fn().mockResolvedValue({
			ok: true,
			status: 200,
			json: async () => samplePlayersResponse(SAMPLE_PLAYERS, 2),
		});
		vi.stubGlobal("fetch", fetchMock);

		const { getByText, getByRole } = renderPlayersRoute();
		await waitFor(() => {
			expect(getByText("Erling Haaland")).toBeInTheDocument();
		});

		fireEvent.click(getByRole("button", { name: "Sort by Name ascending" }));

		await waitFor(() => {
			expect(fetchMock).toHaveBeenCalledTimes(2);
		});
		const requestedUrl = (fetchMock.mock.calls.at(-1) as [string])[0];
		expect(requestedUrl).toContain("sort=name");
		expect(requestedUrl).toContain("order=asc");
		expect(requestedUrl).toContain("page=1");
	});

	it("keeps the previous rows visible instead of a full-page reload while a pagination change is in flight", async () => {
		let resolveSecondFetch: (value: unknown) => void = () => {};
		const secondFetchPromise = new Promise((resolve) => {
			resolveSecondFetch = resolve;
		});

		const fetchMock = vi.fn().mockImplementationOnce(async () => ({
			ok: true,
			status: 200,
			json: async () =>
				samplePlayersResponse(SAMPLE_PLAYERS, SAMPLE_PLAYERS.length * 30),
		}));
		fetchMock.mockImplementationOnce(async () => {
			await secondFetchPromise;
			return {
				ok: true,
				status: 200,
				json: async () =>
					samplePlayersResponse(SAMPLE_PLAYERS, SAMPLE_PLAYERS.length * 30),
			};
		});
		vi.stubGlobal("fetch", fetchMock);

		const { getByText, getByRole, queryByLabelText } = renderPlayersRoute();
		await waitFor(() => {
			expect(getByText("Erling Haaland")).toBeInTheDocument();
		});

		fireEvent.click(getByRole("button", { name: "2" }));

		await waitFor(() => {
			expect(fetchMock).toHaveBeenCalledTimes(2);
		});
		// The second fetch is still pending — rows must stay mounted, not swap to
		// the route's full-page pendingComponent.
		expect(getByText("Erling Haaland")).toBeInTheDocument();
		expect(queryByLabelText("Loading players...")).not.toBeInTheDocument();

		resolveSecondFetch(undefined);
		await waitFor(() => {
			const requestedUrl = (fetchMock.mock.calls.at(-1) as [string])[0];
			expect(requestedUrl).toContain("page=2");
		});
	});
});
