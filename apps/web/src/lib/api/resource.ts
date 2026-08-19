import { type z } from "zod";

import { get } from "./api-client";
import { HttpMethod } from "./types/http-method";
import { type PathParams, type QueryParams } from "./types/requests";

interface BaseRequest<T> {
	path: string;
	pathParams?: PathParams;
	queryParams?: QueryParams;
	schema: z.ZodType<T>;
	signal?: AbortSignal;
}

export interface ListRequest<T> extends BaseRequest<T> {}

export interface RetrieveRequest<T> extends BaseRequest<T> {
	id: string | number;
}

interface ProcessDataRequestParams<T> extends BaseRequest<T> {
	httpMethod: HttpMethod;
}

const getApiFunctionForMethod = (httpMethod: HttpMethod): typeof get => {
	const methodToApiFunctionMap: Record<HttpMethod, typeof get> = {
		[HttpMethod.Get]: get,
	};
	return methodToApiFunctionMap[httpMethod];
};

const processDataRequest = async <T>({
	path,
	httpMethod,
	pathParams = {},
	queryParams = {},
	schema,
	signal,
}: ProcessDataRequestParams<T>): Promise<T> => {
	const data = await getApiFunctionForMethod(httpMethod)({
		path,
		pathParams,
		queryParams,
		signal,
	});

	const parsed = schema.safeParse(data);
	if (!parsed.success) {
		throw new Error("Response did not match the expected schema");
	}
	return parsed.data;
};

export const list = async <T>({
	path,
	pathParams,
	queryParams,
	schema,
	signal,
}: ListRequest<T>): Promise<T> =>
	processDataRequest<T>({
		path,
		httpMethod: HttpMethod.Get,
		pathParams,
		queryParams,
		schema,
		signal,
	});

export const retrieve = async <T>({
	path,
	id,
	pathParams,
	queryParams,
	schema,
	signal,
}: RetrieveRequest<T>): Promise<T> =>
	processDataRequest<T>({
		path,
		httpMethod: HttpMethod.Get,
		pathParams: { ...pathParams, id },
		queryParams,
		schema,
		signal,
	});
