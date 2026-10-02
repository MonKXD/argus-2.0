import { defineConfig, devices } from "@playwright/test";

/**
 * This sandbox pre-installs Chromium outside Playwright's own managed
 * browser cache; PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD stops `pnpm install` from
 * re-fetching a version-matched build, so tests point at it directly.
 */
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_PATH;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: "html",
  use: {
    baseURL: "http://127.0.0.1:3000",
    trace: "on-first-retry",
  },
  webServer: {
    command: "pnpm build && pnpm start",
    url: "http://127.0.0.1:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [
    {
      name: "chromium",
      testIgnore: /\.authenticated\.spec\.ts$/,
      use: {
        ...devices["Desktop Chrome"],
        ...(executablePath ? { launchOptions: { executablePath } } : {}),
      },
    },
    // `auth.setup.ts` signs a throwaway user against the Firebase Auth
    // Emulator (requires `pnpm emulators` running) and saves its session
    // cookie to playwright/.auth/user.json for `chromium-authenticated`'s
    // `dependencies` below to pick up — Playwright only actually runs this
    // project when a selected spec depends on it.
    {
      name: "setup",
      testMatch: /auth\.setup\.ts$/,
    },
    // Specs under `*.authenticated.spec.ts` need a real signed-in session.
    // `baseURL` is `localhost`, not `127.0.0.1`, because the session cookie
    // is host-only to whatever origin the session route issued it for
    // (`APP_URL`) — see auth.setup.ts's own doc comment.
    {
      name: "chromium-authenticated",
      testMatch: /\.authenticated\.spec\.ts$/,
      dependencies: ["setup"],
      use: {
        ...devices["Desktop Chrome"],
        ...(executablePath ? { launchOptions: { executablePath } } : {}),
        baseURL: "http://localhost:3000",
        storageState: "playwright/.auth/user.json",
      },
    },
  ],
});
