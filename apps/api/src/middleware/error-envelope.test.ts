import { errorEnvelope } from "./error-envelope";

describe("errorEnvelope", () => {
	it("builds the { error: { code, message } } shape", () => {
		expect(errorEnvelope(404, "Not Found")).toEqual({
			error: { code: 404, message: "Not Found" },
		});
	});
});
