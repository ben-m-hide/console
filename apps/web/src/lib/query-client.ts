import type { QueryClientConfig } from "@tanstack/react-query";
import { QueryClient } from "@tanstack/react-query";

// Ingestion runs every few hours, so every read endpoint is highly cacheable
// (PROJECT.md §4). Query's own default staleTime is 0, which would refetch on
// every mount and — once route preloading is enabled — on every link hover,
// against an API that rate-limits at 100 requests/15min.
const DEFAULT_STALE_TIME_MS = 5 * 60 * 1000;

// Config is a parameter so tests can build an isolated client with retries off
// — TanStack Query retries 3x with backoff by default, which turns an
// error-state test into a timeout rather than a clean failure. Caller options
// win over the defaults above.
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
