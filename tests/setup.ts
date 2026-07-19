import "@testing-library/jest-dom/vitest";

// jsdom does not implement window.matchMedia. next-themes (and any
// prefers-color-scheme-aware code) calls it on mount, so polyfill it here
// for every test.
if (typeof window !== "undefined" && !window.matchMedia) {
  window.matchMedia = (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  });
}
