import type { QueryParams } from "@/lib/api/types/requests";

export const cleanQueryParams = (
	params: QueryParams,
): Record<string, string> => {
	const cleaned: Record<string, string> = {};
	for (const [key, value] of Object.entries(params)) {
		if (value !== undefined) {
			cleaned[key] = Array.isArray(value) ? value.join(",") : String(value);
		}
	}
	return cleaned;
};
