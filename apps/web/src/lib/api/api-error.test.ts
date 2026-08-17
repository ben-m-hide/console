import { ApiError, isApiError } from "./api-error";

describe("ApiError", () => {
	it("carries a message, url, and status", () => {
		const error = new ApiError("Internal Server Error", "/api/v1/players", 500);
		expect(error.message).toBe("Internal Server Error");
		expect(error.url).toBe("/api/v1/players");
		expect(error.status).toBe(500);
		expect(error.name).toBe("ApiError");
	});
});

describe("isApiError", () => {
	it("returns true for an ApiError instance", () => {
		expect(isApiError(new ApiError("boom", undefined, undefined))).toBe(true);
	});

	it("returns false for a plain Error", () => {
		expect(isApiError(new Error("boom"))).toBe(false);
	});

	it("returns false for a non-error value", () => {
		expect(isApiError("boom")).toBe(false);
	});
});
