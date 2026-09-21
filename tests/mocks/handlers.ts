import type { HttpHandler } from "msw";

/**
 * MSW request handlers, shared by unit/integration tests (R-TST-02: CI never
 * calls the live model or a real external API). Empty until a step or route
 * makes an outbound call worth mocking.
 */
export const handlers: HttpHandler[] = [];
