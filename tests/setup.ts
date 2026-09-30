import "@testing-library/jest-dom/vitest";

import { cleanup } from "@testing-library/react";
import { afterAll, afterEach, beforeAll } from "vitest";

import { server } from "./mocks/server";

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// @testing-library/react's own auto-cleanup detects a *global* afterEach,
// which doesn't exist under this project's `globals: false` (vitest.config.ts:
// explicit imports over implicit globals). Registered explicitly instead.
afterEach(() => cleanup());

// jsdom doesn't implement matchMedia at all (same class of gap as
// showModal()/scrollIntoView, PROJECT_MEMORY section 4). A minimal stub
// that always reports "not matching" is a safe default: every component
// using useMediaQuery treats that as the wide/desktop case.
if (typeof window !== "undefined" && !window.matchMedia) {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList;
}
