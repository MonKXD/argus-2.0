import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    environment: "jsdom",
    globals: false,
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/**/*.test.{ts,tsx}", "src/**/*.test.{ts,tsx}"],
    css: false,
    // Dummy values so src/lib/env.ts (imported by server-side modules under
    // test, e.g. the logger) validates without a real .env file. Never real
    // credentials (R-PRC-04: never commit .env*) — this is TS, not a dotenv
    // file, and every value here is a placeholder.
    env: {
      APP_URL: "http://localhost:3000",
      ANTHROPIC_API_KEY: "test-anthropic-key",
      ANTHROPIC_MODEL_ANALYSIS: "test-model",
      ANTHROPIC_MODEL_SYNTHESIS: "test-model",
      ANTHROPIC_MODEL_FAST: "test-model",
      FIREBASE_PROJECT_ID: "test-project",
      FIREBASE_CLIENT_EMAIL: "test@test-project.iam.gserviceaccount.com",
      FIREBASE_PRIVATE_KEY: "test-private-key",
      NEXT_PUBLIC_FIREBASE_API_KEY: "test",
      NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: "test.firebaseapp.com",
      NEXT_PUBLIC_FIREBASE_PROJECT_ID: "test-project",
      NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: "test.appspot.com",
      NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: "123",
      NEXT_PUBLIC_FIREBASE_APP_ID: "1:123:web:abc",
      NEXT_PUBLIC_USE_FIREBASE_EMULATORS: "true",
    },
  },
});
