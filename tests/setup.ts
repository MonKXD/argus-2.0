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
