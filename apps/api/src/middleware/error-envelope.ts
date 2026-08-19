// PROJECT.md §9: every error response uses this envelope. Single builder so
// error-handler.ts and rate-limiter.ts can't drift from each other's shape.
export interface ErrorEnvelope {
	error: {
		code: number;
		message: string;
	};
}

export const errorEnvelope = (
	code: number,
	message: string,
): ErrorEnvelope => ({
	error: { code, message },
});
