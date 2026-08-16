import { MantineProvider } from "@mantine/core";
import { QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import axe from "axe-core";
import type { PropsWithChildren, ReactElement } from "react";
import { Component, Suspense } from "react";

import { createQueryClient } from "@/lib/query-client";

import { IndexPage } from "./-index-page";

const SAMPLE_COMPETITIONS = [
	{ id: 1, sportmonksId: 8, name: "Premier League", country: "England" },
	{ id: 2, sportmonksId: 82, name: "Bundesliga", country: "Germany" },
];

interface ErrorBoundaryState {
	message: string | null;
}

// useSuspenseQuery throws to the nearest boundary rather than returning an
// error flag, so these tests need real boundaries around the component. In the
// app those roles are played by the route's pendingComponent/errorComponent.
class TestErrorBoundary extends Component<
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
		return <>{this.props.children}</>;
	}
}

const renderIndexPage = (): ReturnType<typeof render> => {
	const queryClient = createQueryClient({
		defaultOptions: { queries: { retry: false } },
	});
	const wrapper = ({ children }: PropsWithChildren): ReactElement => (
		<MantineProvider>
			<QueryClientProvider client={queryClient}>
				<TestErrorBoundary>
					<Suspense fallback={<div>Loading competitions</div>}>
						{children}
					</Suspense>
				</TestErrorBoundary>
			</QueryClientProvider>
		</MantineProvider>
	);
	return render(<IndexPage />, { wrapper });
};

const stubFetchResolving = (body: unknown, ok = true): void => {
	vi.stubGlobal(
		"fetch",
		vi.fn().mockResolvedValue({
			ok,
			status: ok ? 200 : 500,
			json: async () => body,
		}),
	);
};

describe("IndexPage", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("suspends while the request is in flight", () => {
		stubFetchResolving(SAMPLE_COMPETITIONS);
		renderIndexPage();
		expect(screen.getByText("Loading competitions")).toBeInTheDocument();
	});

	it("renders the competitions returned by the API", async () => {
		stubFetchResolving(SAMPLE_COMPETITIONS);
		renderIndexPage();
		await waitFor(() => {
			expect(screen.getByText(/Premier League/)).toBeInTheDocument();
		});
		expect(screen.getByText(/Bundesliga/)).toBeInTheDocument();
	});

	it("throws to the error boundary when the request fails", async () => {
		stubFetchResolving({}, false);
		renderIndexPage();
		await waitFor(() => {
			expect(screen.getByRole("alert")).toHaveTextContent(
				"Request failed: 500",
			);
		});
	});

	it("throws to the error boundary when the response does not match the schema", async () => {
		stubFetchResolving([{ id: 1, name: "Premier League" }]);
		renderIndexPage();
		await waitFor(() => {
			expect(screen.getByRole("alert")).toHaveTextContent(
				"Response did not match the expected schema",
			);
		});
	});

	it("has no accessibility violations", async () => {
		stubFetchResolving(SAMPLE_COMPETITIONS);
		const { container } = renderIndexPage();
		await waitFor(() => {
			expect(screen.getByText(/Premier League/)).toBeInTheDocument();
		});
		const results = await axe.run(container, {
			rules: {
				// jsdom has no layout engine (Range#getClientRects etc. are stubs),
				// so color-contrast can never fully evaluate here regardless of the
				// `canvas` package — it needs a real browser. Out of scope until
				// Playwright E2E lands; see README Known quirks.
				"color-contrast": { enabled: false },
			},
		});
		expect(results.violations).toEqual([]);
		// Assert `incomplete` is empty too, so any *other* check axe silently
		// skips (not just violations) fails loud instead of passing quiet.
		expect(results.incomplete).toEqual([]);
	});
});
