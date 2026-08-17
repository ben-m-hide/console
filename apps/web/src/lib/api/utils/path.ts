import type { PathParams } from "@/lib/api/types/requests";

const pathPlaceholderPattern = /:(\w+)/g;

export const buildPath = (
	placeholderPath: string,
	pathParams: PathParams,
): string => {
	const path = placeholderPath.replace(
		pathPlaceholderPattern,
		(_match, paramKey: string) => {
			if (paramKey in pathParams) {
				return String(pathParams[paramKey]);
			}
			throw new Error(`Path param '${paramKey}' not provided.`);
		},
	);
	return path;
};
