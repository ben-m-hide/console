import { type ErrorEnvelope } from "@console-next/shared";

// PROJECT.md §9: every error response uses this envelope. Single builder so
// error-handler.ts and rate-limiter.ts can't drift from each other's shape.
// The shape itself is @console-next/shared's ErrorEnvelopeSchema — apps/web
// parses against the same schema when mapping a thrown error to a message
// (lib/api/utils/error.ts), so this stays the one place either side's idea
// of "what an API error looks like" is defined.
export const errorEnvelope = (
	code: number,
	message: string,
): ErrorEnvelope => ({
	error: { code, message },
});
