export class ApiError extends Error {
	public readonly status: number | undefined;

	public readonly url: string | undefined;

	// status/url are undefined, not defaulted like the reference project's `= 0`
	// sentinel — a network failure (fetch itself throwing) genuinely has
	// neither, and treating "no status" as distinct from "status 0" is real
	// modeling, not a TS-strictness artifact.
	constructor(
		message: string,
		url: string | undefined,
		status: number | undefined,
	) {
		super(message);
		this.name = "ApiError";
		this.status = status;
		this.url = url;
	}
}

export const isApiError = (error: unknown): error is ApiError =>
	error instanceof ApiError;
