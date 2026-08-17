// Extracted on the second occurrence (ingest-competitions.ts, ingest-seasons.ts).
export const toErrorMessage = (error: unknown): string =>
	error instanceof Error ? error.message : String(error);
