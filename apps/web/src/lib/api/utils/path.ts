import type { PathParams } from "@/lib/api/types";

const PATH_PLACEHOLDER_PATTERN = /:(\w+)/g;

const API_VERSION_PREFIX = "/api/v1";

export const getPathWithPrefix = (path: string = ""): string =>
	`${API_VERSION_PREFIX}${!path || path.startsWith("/") ? "" : "/"}${path}`;

export const buildPath = (
	placeholderPath: string,
	pathParams: PathParams,
): string => {
	const path = placeholderPath.replace(
		PATH_PLACEHOLDER_PATTERN,
		(_match, paramKey: string) => {
			if (paramKey in pathParams) {
				return String(pathParams[paramKey]);
			}
			throw new Error(`Path param '${paramKey}' not provided.`);
		},
	);
	return path;
};
