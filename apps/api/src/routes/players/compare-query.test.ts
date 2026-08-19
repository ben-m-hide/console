import { parseCompareQuery } from "./compare-query";

describe("parseCompareQuery", () => {
	it("parses a comma-separated id list and season into numbers", () => {
		expect(parseCompareQuery("1,2,3", "5")).toEqual({
			playerIds: [1, 2, 3],
			seasonId: 5,
		});
	});

	it("parses a single id", () => {
		expect(parseCompareQuery("42", "1")).toEqual({
			playerIds: [42],
			seasonId: 1,
		});
	});
});
