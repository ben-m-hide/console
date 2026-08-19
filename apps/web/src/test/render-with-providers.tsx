import { MantineProvider } from "@mantine/core";
import { type QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import {
	Component,
	type FC,
	Fragment,
	type PropsWithChildren,
	type ReactElement,
	type ReactNode,
	Suspense,
} from "react";

import { createQueryClient } from "@/lib";

interface ErrorBoundaryState {
	message: string | null;
}

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

export const LOADING_FALLBACK_TEXT = "Loading";

export const createTestQueryClient = (): QueryClient =>
	createQueryClient({ defaultOptions: { queries: { retry: false } } });

interface TestProvidersProps extends PropsWithChildren {
	queryClient: QueryClient;
}

export const TestProviders: FC<TestProvidersProps> = ({
	children,
	queryClient,
}) => (
	<MantineProvider>
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	</MantineProvider>
);

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
