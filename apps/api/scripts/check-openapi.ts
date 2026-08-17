// Guards the OpenAPI document, which nothing else covers: a schema the
// generator can't introspect (z.coerce.number().catch(), the real case,
// 2026-08-16) makes /doc 500 and Scalar render empty at /reference, while
// every route and the rest of the pipeline stays green.
//
// Runs under Bun, not Vitest: Vitest runs on Node, and importing the app
// pulls in drizzle-orm/bun-sql's `bun` module, which can't load there. The
// placeholder DATABASE_URL is enough since the Bun SQL client connects lazily.
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
