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

// jsdom doesn't implement the Pointer Events capture methods at all (same
// class of gap as matchMedia/showModal above) — Radix's Select (and other
// Radix primitives built on pointer events) calls `hasPointerCapture` on
// every pointer interaction, so a click on a Select trigger throws without
// this stub. Always reporting "not captured" is a safe default: it's the
// same state a real element starts in before any `setPointerCapture` call.
if (typeof Element !== "undefined" && !Element.prototype.hasPointerCapture) {
  Element.prototype.hasPointerCapture = () => false;
  Element.prototype.setPointerCapture = () => {};
  Element.prototype.releasePointerCapture = () => {};
}
