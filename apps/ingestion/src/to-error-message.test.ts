import { toErrorMessage } from "./to-error-message";

describe("toErrorMessage", () => {
	it("returns the message of a real Error", () => {
		expect(toErrorMessage(new Error("boom"))).toBe("boom");
	});

	it("stringifies a non-Error thrown value", () => {
		expect(toErrorMessage("just a string")).toBe("just a string");
	});

	it("stringifies a thrown object", () => {
		expect(toErrorMessage({ code: 500 })).toBe("[object Object]");
	});
});
