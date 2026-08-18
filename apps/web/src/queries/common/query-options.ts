import { queryOptions } from "@tanstack/react-query";

import type { ListRequest } from "./list";
import { list } from "./list";

type ListQueryOptionsRequest<T> = Omit<ListRequest<T>, "signal">;

export const listQueryOptions = <T>({
	path,
	pathParams,
	queryParams,
	schema,
}: ListQueryOptionsRequest<T>) =>
	queryOptions({
		queryKey: [path, pathParams, queryParams],
		queryFn: ({ signal }) =>
			list({ path, pathParams, queryParams, schema, signal }),
	});
