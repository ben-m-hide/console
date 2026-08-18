import { waitFor } from "@testing-library/react";

import { SAMPLE_COMPETITIONS } from "@/test/data/sample-data";
import { renderRouteTree } from "@/test/render-route";

const renderRoute = (): ReturnType<typeof renderRouteTree> =>
	renderRouteTree(["/"]);

describe("index route", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("loads competitions via the route loader and renders them", async () => {
		const fetchMock = vi.fn().mockResolvedValue({
			ok: true,
			status: 200,
			json: async () => ({ data: SAMPLE_COMPETITIONS }),
		});
		vi.stubGlobal("fetch", fetchMock);

		const { getByText } = renderRoute();

		await waitFor(() => {
			expect(getByText("Premier League", { exact: false })).toBeInTheDocument();
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

		const { getByText, getByRole } = renderRoute();

		await waitFor(() => {
			expect(getByText("Could not load competitions")).toBeInTheDocument();
		});
		expect(getByRole("button", { name: "Try again" })).toBeInTheDocument();
	});
});
