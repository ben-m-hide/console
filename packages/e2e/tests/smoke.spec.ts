import { expect, test } from "@playwright/test";

// Shaped to match packages/shared's CompetitionSchema — the page safeParses the
// response, so a drifting fixture surfaces as a schema error, not a silent pass.
const SAMPLE_COMPETITIONS = [
	{ id: 1, sportmonksId: 8, name: "Premier League", country: "England" },
	{ id: 2, sportmonksId: 82, name: "Bundesliga", country: "Germany" },
];

test("renders the homepage with no console errors", async ({
	page,
}): Promise<void> => {
	const consoleErrors: Array<string> = [];
	page.on("console", (msg) => {
		if (msg.type() === "error") consoleErrors.push(msg.text());
	});
	page.on("pageerror", (err) => consoleErrors.push(String(err)));

	// CI runs the Vite dev server only — apps/api isn't started, and standing a
	// real API + database up for a smoke test would make it neither smoke nor
	// deterministic. Without this the fetch fails, the page renders its error
	// state, and the failed request itself logs a console error.
	await page.route("**/api/v1/competitions", (route) =>
		route.fulfill({ json: SAMPLE_COMPETITIONS }),
	);

	await page.goto("/");

	await expect(
		page.getByRole("heading", { name: "Competitions" }),
	).toBeVisible();
	await expect(page.getByText("Premier League — England")).toBeVisible();
	await page.screenshot({
		path: "/tmp/console-next-screenshot.png",
		fullPage: true,
	});

	expect(consoleErrors).toEqual([]);
});
