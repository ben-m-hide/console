import "@testing-library/jest-dom/vitest";

// jsdom doesn't implement ResizeObserver; Mantine's Select/Combobox positioning
// (and other size-tracking components) call it during mount.
class ResizeObserverStub {
	observe(): void {}
	unobserve(): void {}
	disconnect(): void {}
}
window.ResizeObserver = ResizeObserverStub;

// jsdom doesn't implement matchMedia; Mantine's color-scheme detection needs it.
Object.defineProperty(window, "matchMedia", {
	writable: true,
	value: (query: string): MediaQueryList =>
		({
			matches: false,
			media: query,
			onchange: null,
			addListener: () => {},
			removeListener: () => {},
			addEventListener: () => {},
			removeEventListener: () => {},
			dispatchEvent: () => false,
		}) as MediaQueryList,
});
