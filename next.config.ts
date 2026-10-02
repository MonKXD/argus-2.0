import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

/**
 * T-6.05 (security review, R-SEC-08/TRD section 11's "Headers" row — CSP,
 * `X-Content-Type-Options`, `Referrer-Policy`, `frame-ancestors`, HSTS in
 * production). No nonce: Next 16's own App Router injects small inline
 * `<script>` tags for RSC payload streaming (`self.__next_f.push(...)`,
 * confirmed by inspecting a real rendered page), so a strict
 * nonce-based `script-src` would need every page dynamically rendered
 * (Next's own CSP guide, `node_modules/next/dist/docs/01-app/02-guides/
 * content-security-policy.md`, is explicit about this) — that would
 * regress the landing page and other already-static routes against this
 * project's own documented LCP budget (TRD section 12) for a stricter
 * policy than `'unsafe-inline'` buys in practice here, since this app has
 * no third-party or user-controlled script sources to begin with (R-UI-04:
 * claims render as text, never `dangerouslySetInnerHTML`; grep confirms no
 * `<script>`/`next/script` usage anywhere in `src/`). `connect-src` is
 * scoped to the real hosts the client Firebase SDK talks to
 * (`src/lib/firebase/client.ts`: Auth, Firestore, Storage), plus the local
 * emulator/HMR origins only in dev.
 */
const cspHeader = `
  default-src 'self';
  script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""};
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: blob:;
  font-src 'self';
  connect-src 'self' https://*.googleapis.com https://firebasestorage.googleapis.com${isDev ? " http://127.0.0.1:* ws://127.0.0.1:* ws://localhost:*" : ""};
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  frame-ancestors 'none';
  upgrade-insecure-requests;
`
  .replace(/\s{2,}/g, " ")
  .trim();

const securityHeaders = [
  { key: "Content-Security-Policy", value: cspHeader },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  ...(isDev ? [] : [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" }]),
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
  // firebase-admin is on Next's own built-in server-external-packages list
  // (resolved via native `require` at runtime, not bundled), but its own
  // file tracing missed the package on Vercel in production — confirmed
  // live ("Failed to load external module firebase-admin-<hash>" on every
  // route under /api/auth/session, the routes 200OK locally where tracing
  // isn't a factor). firebase-admin's Firestore/Storage services also pull
  // in @google-cloud/firestore, @grpc/grpc-js and google-gax, so all three
  // are force-included too rather than waiting to hit the same failure
  // there next.
  //
  // Deliberately scoped to just this one route/package for now: two
  // earlier attempts at the full scope (every /api/* route plus
  // @google-cloud/firestore, @grpc/grpc-js, google-gax) built fine
  // locally but failed during Vercel's own "Deploying outputs..." step
  // with no error message reachable anywhere (build log, runtime log,
  // deployment overview, Resources tab); this exact minimal version
  // deployed successfully on the first try. Auth (this route) was the
  // blocking bug, so it ships now rather than risk breaking a working
  // deploy again — the Firestore-touching routes (analyses list/create)
  // will hit the same "Failed to load external module firebase-admin"
  // error T-3.09/T-3.10 surfaces it, at which point expand this scope
  // and verify the larger config deploys before shipping it, rather
  // than assume it will just because it built locally (it did, twice,
  // and still failed to deploy both times).
  outputFileTracingIncludes: {
    "/api/auth/session": ["./node_modules/firebase-admin/**/*"],
  },
};

export default nextConfig;
