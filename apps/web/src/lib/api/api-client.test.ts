import { API, get } from "./api-client";
import { isApiError } from "./api-error";

describe("apiClient", () => {
	beforeEach(() => {
		API.configure({ endpoint: "http://localhost:4100" });
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("resolves with the parsed body on a successful response", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue({
				ok: true,
				status: 200,
				json: async () => ({ hello: "world" }),
			}),
		);

		const body = await get({
			path: "/anything",
			signal: new AbortController().signal,
		});
		expect(body).toEqual({ hello: "world" });
	});

	it("throws an ApiError with the API's own error message on a non-2xx response", async () => {
		const envelope = { error: { code: 500, message: "Internal Server Error" } };
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue({
				ok: false,
				status: 500,
				json: async () => envelope,
				text: async () => JSON.stringify(envelope),
				clone() {
					return this;
				},
			}),
		);

		await expect(
			get({ path: "/anything", signal: new AbortController().signal }),
		).rejects.toSatisfy(
			(error: unknown) =>
				isApiError(error) &&
				error.message === "Internal Server Error" &&
				error.status === 500,
		);
	});

	it("throws an ApiError from a network failure, with no status", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn().mockRejectedValue(new TypeError("Failed to fetch")),
		);

		await expect(
			get({ path: "/anything", signal: new AbortController().signal }),
		).rejects.toSatisfy(
			(error: unknown) =>
				isApiError(error) &&
				error.message === "Failed to fetch" &&
				error.status === undefined,
		);
	});

	it("omits undefined query params instead of serializing the literal string", async () => {
		const fetchMock = vi.fn().mockResolvedValue({
			ok: true,
			status: 200,
			json: async () => ({}),
		});
		vi.stubGlobal("fetch", fetchMock);

		await get({
			path: "/anything",
			queryParams: { page: 1, search: undefined },
			signal: new AbortController().signal,
		});

		const requestedUrl = (fetchMock.mock.calls.at(-1) as [string])[0];
		expect(requestedUrl).toContain("page=1");
		expect(requestedUrl).not.toContain("search");
	});
});
