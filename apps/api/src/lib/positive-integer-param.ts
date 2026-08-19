// Strict validator for a query param that must be a positive integer or
// absent — rejects (via the regex, at the Zod layer) rather than degrading.
// This is a different contract from players/list-query.ts's
// parsePositiveInteger, which clamps a malformed pagination value to a
// default instead of 400ing — the two aren't merged, they're deliberately
// different philosophies for different inputs (see docs/plans/2026-08-19-
// api-architecture-review.md Part 1).
export const POSITIVE_INTEGER_PATTERN = /^\d+$/;

export const positiveIntegerParamMessage = (paramName: string): string =>
	`${paramName} must be a positive integer`;
