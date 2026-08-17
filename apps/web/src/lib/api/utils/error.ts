export const getMessage = (error: unknown): string =>
	error instanceof Error ? error.message : String(error);

export const getStatus = (error: unknown): number | undefined =>
	typeof error === "object" &&
	error !== null &&
	"status" in error &&
	typeof error.status === "number"
		? error.status
		: undefined;

export const getUrl = (error: unknown): string | undefined =>
	typeof error === "object" &&
	error !== null &&
	"url" in error &&
	typeof error.url === "string"
		? error.url
		: undefined;

export const toApiErrorMessage = (rawMessage: string): string => {
	try {
		const parsed: unknown = JSON.parse(rawMessage);
		if (
			typeof parsed === "object" &&
			parsed !== null &&
			"error" in parsed &&
			typeof parsed.error === "object" &&
			parsed.error !== null &&
			"message" in parsed.error &&
			typeof parsed.error.message === "string"
		) {
			return parsed.error.message;
		}
	} catch {
		// Not JSON — a network failure or a non-JSON error body.
	}
	return rawMessage;
};
