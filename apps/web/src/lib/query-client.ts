import type { QueryClientConfig } from "@tanstack/react-query";
import { QueryClient } from "@tanstack/react-query";

// Ingestion runs every few hours (PROJECT.md §4), so reads are highly
// cacheable — Query's default staleTime of 0 would refetch on every mount
// against an API that rate-limits at 100 requests/15min.
const DEFAULT_STALE_TIME_MS = 5 * 60 * 1000;

// Config is a parameter so tests can disable retries — Query's default 3x
// backoff turns an error-state test into a timeout. Caller options win.
export const createQueryClient = (config?: QueryClientConfig): QueryClient =>
	new QueryClient({
		...config,
		defaultOptions: {
			...config?.defaultOptions,
			queries: {
				staleTime: DEFAULT_STALE_TIME_MS,
				...config?.defaultOptions?.queries,
			},
		},
	});

export const queryClient = createQueryClient();
