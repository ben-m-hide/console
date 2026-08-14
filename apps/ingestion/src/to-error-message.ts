// Extracted once this exact expression appeared a second time
// (ingest-competitions.ts and ingest-seasons.ts's catch blocks) — per
// docs/conventions/typescript.md's "check for an existing util before
// writing one".
export const toErrorMessage = (error: unknown): string =>
	error instanceof Error ? error.message : String(error);
