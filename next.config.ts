import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // firebase-admin is on Next's own built-in server-external-packages list
  // (resolved via native `require` at runtime, not bundled), but its own
  // file tracing missed the package on Vercel in production — confirmed
  // live ("Failed to load external module firebase-admin-<hash>" on every
  // route under /api/auth/session, the routes 200OK locally where tracing
  // isn't a factor). firebase-admin's Firestore/Storage services also pull
  // in @google-cloud/firestore, @grpc/grpc-js and google-gax, so all three
  // are force-included too rather than waiting to hit the same failure
  // there next. Scoped to every route ('/*') since firebase-admin is used
  // from both API route handlers and at least one server-rendered page
  // (src/app/app/analyses/[id]/setup/page.tsx).
  outputFileTracingIncludes: {
    "/*": [
      "./node_modules/firebase-admin/**/*",
      "./node_modules/@google-cloud/firestore/**/*",
      "./node_modules/@grpc/grpc-js/**/*",
      "./node_modules/google-gax/**/*",
    ],
  },
};

export default nextConfig;
