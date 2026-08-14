// Shared between every ingest-<entity>.ts's Result type — extracted once
// IngestCompetitionsResult and IngestSeasonsResult both needed the exact
// same failed-item shape, per docs/conventions/typescript.md's "name inline
// object types" rule.
export interface IngestionFailure {
	id: number;
	name: string;
	error: string;
}
