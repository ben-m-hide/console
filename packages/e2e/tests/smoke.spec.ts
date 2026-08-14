import { expect, test } from "@playwright/test";

test("renders the homepage with no console errors", async ({
	page,
}): Promise<void> => {
	const consoleErrors: Array<string> = [];
	page.on("console", (msg) => {
		if (msg.type() === "error") consoleErrors.push(msg.text());
	});
	page.on("pageerror", (err) => consoleErrors.push(String(err)));

	await page.goto("/");

	await expect(
		page.getByRole("heading", { name: "console-next" }),
	).toBeVisible();
	await expect(page.getByRole("button", { name: "It works" })).toBeVisible();
	await page.screenshot({
		path: "/tmp/console-next-screenshot.png",
		fullPage: true,
	});

	expect(consoleErrors).toEqual([]);
});
