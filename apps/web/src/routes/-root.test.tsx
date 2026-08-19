import { waitFor } from "@testing-library/react";

import { renderRouteTree } from "@/test/render-route";

describe("root route", () => {
	it("renders the notFoundComponent for an unmatched path", async () => {
		const { getByText, getByRole } = renderRouteTree(["/does-not-exist"]);

		await waitFor(() => {
			expect(getByText("Page not found")).toBeInTheDocument();
		});
		expect(getByRole("link", { name: "Go to homepage" })).toHaveAttribute(
			"href",
			"/",
		);
	});
});
