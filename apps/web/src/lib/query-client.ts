import type { QueryClientConfig } from "@tanstack/react-query";
import { QueryClient } from "@tanstack/react-query";

// Config is a parameter so tests can build an isolated client with retries off
// — TanStack Query retries 3x with backoff by default, which turns an
// error-state test into a timeout rather than a clean failure.
export const createQueryClient = (config?: QueryClientConfig): QueryClient =>
	new QueryClient(config);

export const queryClient = createQueryClient();
