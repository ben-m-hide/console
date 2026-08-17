import { waitFor } from "@testing-library/react";
import axe from "axe-core";

import {
	LOADING_FALLBACK_TEXT,
	renderWithProviders,
} from "@/test/render-with-providers";
import { SAMPLE_COMPETITIONS } from "@/test/route-fixtures";

import { IndexPage } from "./-index-page";

const renderIndexPage = (): ReturnType<typeof renderWithProviders> =>
	renderWithProviders(<IndexPage />);

const stubFetchResolving = (body: unknown, ok = true): void => {
	vi.stubGlobal(
		"fetch",
		vi.fn().mockResolvedValue({
			ok,
			status: ok ? 200 : 500,
			json: async () => body,
			text: async () => JSON.stringify(body),
			clone() {
				return this;
			},
		}),
	);
};

describe("IndexPage", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("suspends while the request is in flight", () => {
		stubFetchResolving(SAMPLE_COMPETITIONS);
		const { getByText } = renderIndexPage();
		expect(getByText(LOADING_FALLBACK_TEXT)).toBeInTheDocument();
	});

	it("renders the competitions returned by the API", async () => {
		stubFetchResolving(SAMPLE_COMPETITIONS);
		const { getByText } = renderIndexPage();
		await waitFor(() => {
			expect(getByText("Premier League", { exact: false })).toBeInTheDocument();
		});
		expect(getByText("Bundesliga", { exact: false })).toBeInTheDocument();
	});

	it("throws to the error boundary when the request fails", async () => {
		stubFetchResolving(
			{ error: { code: 500, message: "Internal Server Error" } },
			false,
		);
		const { getByRole } = renderIndexPage();
		await waitFor(() => {
			expect(getByRole("alert")).toHaveTextContent("Internal Server Error");
		});
	});

	it("throws to the error boundary when the response does not match the schema", async () => {
		stubFetchResolving([{ id: 1, name: "Premier League" }]);
		const { getByRole } = renderIndexPage();
		await waitFor(() => {
			expect(getByRole("alert")).toHaveTextContent(
				"Response did not match the expected schema",
			);
		});
	});

	it("has no accessibility violations", async () => {
		stubFetchResolving(SAMPLE_COMPETITIONS);
		const { container, getByText } = renderIndexPage();
		await waitFor(() => {
			expect(getByText("Premier League", { exact: false })).toBeInTheDocument();
		});
		const results = await axe.run(container, {
			rules: {
				// jsdom has no layout engine, so color-contrast can never fully
				// evaluate here — needs a real browser. See README Known quirks.
				"color-contrast": { enabled: false },
			},
		});
		expect(results.violations).toEqual([]);
		// Catches axe silently skipping a check too, not just real violations.
		expect(results.incomplete).toEqual([]);
	});
});
