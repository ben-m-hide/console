import { MantineProvider } from "@mantine/core";
import type { QueryClient } from "@tanstack/react-query";
import { QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import type { FC, PropsWithChildren, ReactElement, ReactNode } from "react";
import { Component, Fragment, Suspense } from "react";

import { createQueryClient } from "@/lib/query-client";

// Text rendered by the Suspense fallback, exported so a test asserting the
// pending state matches on the same string the helper renders.
export const LOADING_FALLBACK_TEXT = "Loading";

// Retries are off: TanStack Query retries 3x with backoff by default, which
// turns an error-state test into a timeout rather than a clean failure.
export const createTestQueryClient = (): QueryClient =>
	createQueryClient({ defaultOptions: { queries: { retry: false } } });

interface ErrorBoundaryState {
	message: string | null;
}

// useSuspenseQuery throws to the nearest boundary rather than returning an
// error flag, so a component test needs a real boundary around it. In the app
// this role is played by the route's errorComponent.
export class TestErrorBoundary extends Component<
	PropsWithChildren,
	ErrorBoundaryState
> {
	override state: ErrorBoundaryState = { message: null };

	static getDerivedStateFromError(error: Error): ErrorBoundaryState {
		return { message: error.message };
	}

	override render(): ReactElement {
		const { message } = this.state;
		if (message !== null) {
			return <div role="alert">{message}</div>;
		}
		return <Fragment>{this.props.children}</Fragment>;
	}
}

interface TestProvidersProps extends PropsWithChildren {
	queryClient: QueryClient;
}

// The app-level providers a rendered subtree needs, mirroring main.tsx's
// nesting. Route tests compose this around their own RouterProvider; component
// tests get it via renderWithProviders below.
export const TestProviders: FC<TestProvidersProps> = ({
	children,
	queryClient,
}) => (
	<MantineProvider>
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	</MantineProvider>
);

// For component-level tests: adds the Suspense and error boundaries that the
// route would otherwise supply via pendingComponent/errorComponent.
export const renderWithProviders = (
	ui: ReactNode,
): ReturnType<typeof render> => {
	const queryClient = createTestQueryClient();
	const wrapper: FC<PropsWithChildren> = ({ children }) => (
		<TestProviders queryClient={queryClient}>
			<TestErrorBoundary>
				<Suspense fallback={<div>{LOADING_FALLBACK_TEXT}</div>}>
					{children}
				</Suspense>
			</TestErrorBoundary>
		</TestProviders>
	);
	return render(ui, { wrapper });
};
