import { MantineProvider } from "@mantine/core";
import { render } from "@testing-library/react";
import axe from "axe-core";

import { IndexPage } from "./-index-page";

describe("IndexPage", () => {
	it("renders the Mantine button", () => {
		const { getByRole } = render(
			<MantineProvider>
				<IndexPage />
			</MantineProvider>,
		);
		expect(getByRole("button", { name: "It works" })).toBeInTheDocument();
	});

	it("has no accessibility violations", async () => {
		const { container } = render(
			<MantineProvider>
				<IndexPage />
			</MantineProvider>,
		);
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
