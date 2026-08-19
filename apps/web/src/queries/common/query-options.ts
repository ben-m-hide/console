import { queryOptions } from "@tanstack/react-query";

import {
	type ListRequest,
	list,
	type RetrieveRequest,
	retrieve,
} from "@/lib/api";

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

type RetrieveQueryOptionsRequest<T> = Omit<RetrieveRequest<T>, "signal">;

export const retrieveQueryOptions = <T>({
	path,
	id,
	pathParams,
	queryParams,
	schema,
}: RetrieveQueryOptionsRequest<T>) =>
	queryOptions({
		queryKey: [path, id, pathParams, queryParams],
		queryFn: ({ signal }) =>
			retrieve({
				path,
				id,
				pathParams,
				queryParams,
				schema,
				signal,
			}),
	});
