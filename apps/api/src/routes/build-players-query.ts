export const DEFAULT_PAGE_SIZE = 25;
export const MAX_PAGE_SIZE = 50;

export interface PlayersPagination {
	page: number;
	pageSize: number;
	offset: number;
}

export interface PlayersPageMeta {
	page: number;
	pageSize: number;
	total: number;
	totalPages: number;
}

// Query params arrive as strings, and are parsed here rather than in the Zod
// schema: @hono/zod-openapi cannot introspect a `z.coerce.number().catch()`
// wrapper and returns a 500 for /doc if one is used, which in turn leaves
// Scalar rendering an empty page. Keeping the parse here also makes the
// lenient-fallback behaviour unit-testable instead of schema magic.
const parsePositiveInteger = (
	raw: string | undefined,
	fallback: number,
): number => {
	if (raw === undefined) {
		return fallback;
	}
	const parsed = Number(raw);
	if (!Number.isFinite(parsed) || !Number.isInteger(parsed)) {
		return fallback;
	}
	return parsed;
};

// Clamps rather than rejects: a page number past the end returns an empty
// page, which is a normal outcome for a paginated list, not a client error.
// A malformed value degrades to the default rather than 400-ing the screen —
// a hand-edited or shared URL should still render something.
export const resolvePagination = (
	rawPage: string | undefined,
	rawPageSize: string | undefined,
): PlayersPagination => {
	const requestedPage = parsePositiveInteger(rawPage, 1);
	const requestedPageSize = parsePositiveInteger(
		rawPageSize,
		DEFAULT_PAGE_SIZE,
	);
	const pageSize = Math.min(Math.max(requestedPageSize, 1), MAX_PAGE_SIZE);
	const page = Math.max(requestedPage, 1);
	const pagination: PlayersPagination = {
		page,
		pageSize,
		offset: (page - 1) * pageSize,
	};
	return pagination;
};

export const buildPageMeta = (
	pagination: PlayersPagination,
	total: number,
): PlayersPageMeta => {
	const meta: PlayersPageMeta = {
		page: pagination.page,
		pageSize: pagination.pageSize,
		total,
		totalPages: Math.ceil(total / pagination.pageSize),
	};
	return meta;
};
