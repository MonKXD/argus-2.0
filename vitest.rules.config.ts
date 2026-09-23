import { defineConfig } from "vitest/config";

/**
 * Separate config for Firestore/Storage security-rules tests (R-TST-05):
 * these make real network calls to the Firestore emulator, which the shared
 * vitest.config.ts's MSW setup (tests/setup.ts, "error on unhandled
 * request") would otherwise intercept and fail. Requires the emulator
 * running (`pnpm emulators`) — not part of `pnpm test`/`pnpm check`, same
 * reasoning `pnpm test:e2e` already needs a dev server. Run with
 * `pnpm test:rules`.
 */
export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    environment: "node",
    globals: false,
    include: ["tests/rules/**/*.spec.ts"],
  },
});
