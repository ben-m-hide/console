import wretch, {
	type ConfiguredMiddleware,
	type Wretch,
	type WretchError,
} from "wretch";
import queryStringAddon, {
	type QueryStringAddon,
} from "wretch/addons/queryString";

import {
	buildPath,
	cleanQueryParams,
	getMessage,
	getPathWithPrefix,
	getStatus,
	getUrl,
	type PathParams,
	type QueryParams,
	toApiErrorMessage,
} from "@/lib/api";

import { ApiError } from "./api-error";

type Client = QueryStringAddon &
	Wretch<QueryStringAddon, unknown, undefined, WretchError>;

type Headers = Record<string, string>;

interface ApiRequest {
	path: string;
	pathParams?: PathParams;
	queryParams?: QueryParams;
	headers?: Headers;
	signal?: AbortSignal;
}

interface ApiConfig {
	endpoint: string;
	headers?: () => Promise<Headers>;
}

const errorMapper = (error: unknown): never => {
	throw new ApiError(
		toApiErrorMessage(getMessage(error)),
		getUrl(error),
		getStatus(error),
	);
};

class ApiClass {
	client: Client | undefined;

	configure(config: ApiConfig): void {
		const headersMiddleware: ConfiguredMiddleware =
			(next) => async (url, options) => {
				const headers = await config.headers?.();
				return next(url, {
					...options,
					headers: { ...options.headers, ...headers },
				});
			};

		const middlewares = config.headers ? [headersMiddleware] : [];

		this.client = wretch(config.endpoint)
			.addon(queryStringAddon)
			.middlewares(middlewares)
			.catcherFallback(errorMapper);
	}
}

export const API = new ApiClass();

export const getClient = ({
	path,
	pathParams = {},
	queryParams = {},
	headers = {},
	signal,
}: ApiRequest): Client => {
	if (!API.client) {
		throw new Error("Call API.configure before attempting to make requests");
	}

	return API.client
		.options(signal ? { signal } : {})
		.url(buildPath(getPathWithPrefix(path), pathParams))
		.headers(headers)
		.query(cleanQueryParams(queryParams));
};

export const get = <T>(request: ApiRequest): Promise<T> =>
	getClient(request).get().json<T>();
