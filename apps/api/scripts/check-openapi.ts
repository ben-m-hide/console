// Guards the OpenAPI document, which nothing else covers.
//
// A schema the generator cannot introspect — z.coerce.number().catch() was the
// real case, 2026-08-16 — makes /doc return a 500 and leaves Scalar rendering
// an empty page at /reference, while every route keeps working normally. Lint,
// typecheck, unit tests and E2E all stay green through that.
//
// This runs under Bun rather than Vitest deliberately: Vitest runs on Node, and
// importing the app pulls in drizzle-orm/bun-sql, which imports the `bun`
// module and cannot load there. A placeholder DATABASE_URL is enough — src/db.ts
// throws at import time if it is missing, but the Bun SQL client connects
// lazily, so generating the document never opens a connection.
process.env.DATABASE_URL ??= "postgres://check:check@localhost:5432/check";

const EXPECTED_PATH_PREFIX = "/api/v1/";

const { default: app } = await import("../src/index");

const docResponse = await app.request("/doc");
if (docResponse.status !== 200) {
	const body = await docResponse.text();
	console.error(
		`FAIL /doc returned ${docResponse.status}, expected 200.\n${body}`,
	);
	process.exit(1);
}

const document = (await docResponse.json()) as {
	openapi?: string;
	paths?: Record<string, unknown>;
};

const paths = Object.keys(document.paths ?? {});
if (document.openapi === undefined || paths.length === 0) {
	console.error(
		`FAIL /doc generated an empty document (openapi=${document.openapi}, paths=${paths.length}).`,
	);
	process.exit(1);
}

const unversioned = paths.filter(
	(path) => !path.startsWith(EXPECTED_PATH_PREFIX),
);
if (unversioned.length > 0) {
	console.error(
		`FAIL documented routes outside ${EXPECTED_PATH_PREFIX}: ${unversioned.join(", ")}`,
	);
	process.exit(1);
}

const referenceResponse = await app.request("/reference");
if (referenceResponse.status !== 200) {
	console.error(
		`FAIL /reference returned ${referenceResponse.status}, expected 200.`,
	);
	process.exit(1);
}

console.log(
	`OK /doc ${document.openapi}, ${paths.length} routes documented; /reference serving.`,
);
