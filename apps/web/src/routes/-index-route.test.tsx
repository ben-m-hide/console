import { screen, waitFor } from "@testing-library/react";

import { renderRouteTree } from "@/test/render-route";
import { SAMPLE_COMPETITIONS } from "@/test/route-fixtures";

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
