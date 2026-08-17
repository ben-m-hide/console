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

// Parsed here, not in the Zod schema: @hono/zod-openapi can't introspect
// `z.coerce.number().catch()` and returns a 500 for /doc if used, leaving
// Scalar rendering an empty page. Also makes the fallback unit-testable.
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

// Clamps rather than rejects: a page past the end or a malformed value
// degrades to an empty page or the default — a hand-edited or shared URL
// should still render something, not 400.
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
