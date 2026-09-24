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
  // there next.
  //
  // Scoped to only the routes that actually import firebase-admin (every
  // /api/* route, per grep, plus one server-rendered page), not a global
  // '/*' — that first attempt applied the same ~250MB+ of extra files to
  // every route including fully static ones (/login, /signup, /sample,
  // /dev/ui, /) that never touch it, and blew past Vercel's per-deployment
  // size limit during the deploy step (build itself succeeded; the failure
  // was in "Deploying outputs..."). Dynamic-segment route keys need their
  // brackets escaped for picomatch, per Next's own documented example.
  outputFileTracingIncludes: {
    "/api/**": [
      "./node_modules/firebase-admin/**/*",
      "./node_modules/@google-cloud/firestore/**/*",
      "./node_modules/@grpc/grpc-js/**/*",
      "./node_modules/google-gax/**/*",
    ],
    "/app/analyses/\\[id\\]/setup": [
      "./node_modules/firebase-admin/**/*",
      "./node_modules/@google-cloud/firestore/**/*",
      "./node_modules/@grpc/grpc-js/**/*",
      "./node_modules/google-gax/**/*",
    ],
  },
};

export default nextConfig;
