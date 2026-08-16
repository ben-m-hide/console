import { screen, waitFor } from "@testing-library/react";
import axe from "axe-core";

import {
	LOADING_FALLBACK_TEXT,
	renderWithProviders,
} from "@/test/render-with-providers";

import { IndexPage } from "./-index-page";

const SAMPLE_COMPETITIONS = [
	{ id: 1, sportmonksId: 8, name: "Premier League", country: "England" },
	{ id: 2, sportmonksId: 82, name: "Bundesliga", country: "Germany" },
];

const renderIndexPage = (): ReturnType<typeof renderWithProviders> =>
	renderWithProviders(<IndexPage />);

const stubFetchResolving = (body: unknown, ok = true): void => {
	vi.stubGlobal(
		"fetch",
		vi.fn().mockResolvedValue({
			ok,
			status: ok ? 200 : 500,
			json: async () => body,
		}),
	);
};

describe("IndexPage", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("suspends while the request is in flight", () => {
		stubFetchResolving(SAMPLE_COMPETITIONS);
		renderIndexPage();
		expect(screen.getByText(LOADING_FALLBACK_TEXT)).toBeInTheDocument();
	});

	it("renders the competitions returned by the API", async () => {
		stubFetchResolving(SAMPLE_COMPETITIONS);
		renderIndexPage();
		await waitFor(() => {
			expect(screen.getByText(/Premier League/)).toBeInTheDocument();
		});
		expect(screen.getByText(/Bundesliga/)).toBeInTheDocument();
	});

	it("throws to the error boundary when the request fails", async () => {
		stubFetchResolving({}, false);
		renderIndexPage();
		await waitFor(() => {
			expect(screen.getByRole("alert")).toHaveTextContent(
				"Request failed: 500",
			);
		});
	});

	it("throws to the error boundary when the response does not match the schema", async () => {
		stubFetchResolving([{ id: 1, name: "Premier League" }]);
		renderIndexPage();
		await waitFor(() => {
			expect(screen.getByRole("alert")).toHaveTextContent(
				"Response did not match the expected schema",
			);
		});
	});

	it("has no accessibility violations", async () => {
		stubFetchResolving(SAMPLE_COMPETITIONS);
		const { container } = renderIndexPage();
		await waitFor(() => {
			expect(screen.getByText(/Premier League/)).toBeInTheDocument();
		});
		const results = await axe.run(container, {
			rules: {
				// jsdom has no layout engine (Range#getClientRects etc. are stubs),
				// so color-contrast can never fully evaluate here regardless of the
				// `canvas` package — it needs a real browser. Out of scope until
				// Playwright E2E lands; see README Known quirks.
				"color-contrast": { enabled: false },
			},
		});
		expect(results.violations).toEqual([]);
		// Assert `incomplete` is empty too, so any *other* check axe silently
		// skips (not just violations) fails loud instead of passing quiet.
		expect(results.incomplete).toEqual([]);
	});
});
