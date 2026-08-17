// Shared once two ingest-<entity>.ts Result types needed the same shape.
export interface IngestionFailure {
	id: number;
	name: string;
	error: string;
}
