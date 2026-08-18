import type { z } from "zod";

import { get } from "@/lib/api";
import type { PathParams, QueryParams } from "@/lib/api/types";

export interface ListRequest<T> {
	path: string;
	pathParams?: PathParams;
	queryParams?: QueryParams;
	schema: z.ZodType<T>;
	signal?: AbortSignal;
}

export const list = async <T>({
	path,
	pathParams,
	queryParams,
	schema,
	signal,
}: ListRequest<T>): Promise<T> => {
	const body = await get({ path, pathParams, queryParams, signal });

	const parsed = schema.safeParse(body);
	if (!parsed.success) {
		throw new Error("Response did not match the expected schema");
	}
	return parsed.data;
};
