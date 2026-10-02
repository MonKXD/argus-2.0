import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { test as setup } from "@playwright/test";

/**
 * Playwright setup project (runs once, before the `chromium-authenticated`
 * project that `dependencies: ["setup"]` on it — see playwright.config.ts):
 * authenticates a throwaway user against the real Firebase Auth Emulator
 * (never production) and saves the resulting session cookie as a
 * `storageState` file, so authenticated specs (anything under `*.app/*`)
 * can skip driving the signup UI and start already signed in.
 *
 * Replicates the app's own real client flow (`signUpWithEmail` in
 * `src/lib/firebase/client-auth.ts`) via two HTTP calls instead of a browser:
 * 1. The Auth Emulator's own REST `accounts:signUp` endpoint (no real
 *    Firebase project or API key validation involved — the emulator accepts
 *    any non-empty `key` query param).
 * 2. The app's own `POST /api/auth/session` route, exactly as the real
 *    client does, to exchange the ID token for the app's session cookie.
 *
 * Requires `pnpm emulators` running (same requirement as `pnpm test:rules`).
 * If the Auth Emulator isn't reachable, this throws with a clear message
 * rather than silently producing an empty/invalid storageState that would
 * make every authenticated spec fail with a confusing "not logged in" error.
 *
 * Gotcha (see docs/PROJECT_MEMORY.md): `playwright.config.ts`'s default
 * `baseURL` is `http://127.0.0.1:3000`, but the session route's origin check
 * (`assertSameOrigin`) requires the request's Origin header to exactly match
 * `APP_URL` (`http://localhost:3000` in `.env.local`), and the resulting
 * cookie is host-only to whatever host actually served it. `localhost` and
 * `127.0.0.1` are different cookie origins to a real browser even though
 * they're the same server — so the `chromium-authenticated` project overrides
 * `baseURL` to `http://localhost:3000`.
 */

const AUTH_EMULATOR_HOST = "http://127.0.0.1:9099";
const APP_ORIGIN = "http://localhost:3000";
const STORAGE_STATE_PATH = path.join(process.cwd(), "playwright/.auth/user.json");

setup("authenticate against the Firebase Auth Emulator", async () => {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "test-api-key";
  const email = `e2e-${Date.now()}@example.test`;
  const password = "E2e-Test-Passw0rd!";

  const signUpResponse = await fetch(
    `${AUTH_EMULATOR_HOST}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    },
  ).catch((error: unknown) => {
    throw new Error(
      `Couldn't reach the Firebase Auth Emulator at ${AUTH_EMULATOR_HOST}. Authenticated e2e specs need ` +
        `\`pnpm emulators\` running first. Original error: ${String(error)}`,
    );
  });

  if (!signUpResponse.ok) {
    throw new Error(`Auth Emulator sign-up failed (${signUpResponse.status}): ${await signUpResponse.text()}`);
  }

  const { idToken } = (await signUpResponse.json()) as { idToken: string };

  const sessionResponse = await fetch(`${APP_ORIGIN}/api/auth/session`, {
    method: "POST",
    headers: { "content-type": "application/json", origin: APP_ORIGIN },
    body: JSON.stringify({ idToken }),
  });

  if (!sessionResponse.ok) {
    throw new Error(`Session-cookie exchange failed (${sessionResponse.status}): ${await sessionResponse.text()}`);
  }

  const setCookieHeader = sessionResponse.headers.get("set-cookie");
  if (!setCookieHeader) {
    throw new Error("Session-cookie exchange succeeded but the response set no cookie.");
  }

  const [nameValue, ...attrParts] = setCookieHeader.split(";");
  const [cookieName, cookieValue] = nameValue.split("=");
  const maxAgeAttr = attrParts.find((part) => part.trim().toLowerCase().startsWith("max-age="));
  const maxAgeSeconds = maxAgeAttr ? Number(maxAgeAttr.trim().split("=")[1]) : 60 * 60 * 24 * 5;

  await mkdir(path.dirname(STORAGE_STATE_PATH), { recursive: true });
  await writeFile(
    STORAGE_STATE_PATH,
    JSON.stringify(
      {
        cookies: [
          {
            name: cookieName.trim(),
            value: cookieValue.trim(),
            domain: "localhost",
            path: "/",
            expires: Math.floor(Date.now() / 1000) + maxAgeSeconds,
            httpOnly: true,
            secure: false,
            sameSite: "Lax" as const,
          },
        ],
        origins: [],
      },
      null,
      2,
    ),
  );
});
