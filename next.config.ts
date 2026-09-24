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
  // Minimal test case (diagnosing a Vercel-deploy-step-only failure that
  // doesn't reproduce locally and isn't explained by byte size): just
  // firebase-admin itself, just the one route that needs it fixed most.
  // A prior attempt scoped to every /api/* route plus firebase-admin's
  // Firestore/grpc/gax dependencies built fine locally and even measured
  // well under Vercel's per-function size limit, but still failed during
  // Vercel's own "Deploying outputs..." step with no visible error message
  // anywhere reachable (build log, runtime log, deployment overview) —
  // reverting to no outputFileTracingIncludes at all deploys fine, so the
  // option itself is the trigger, not anything else in this commit.
  outputFileTracingIncludes: {
    "/api/auth/session": ["./node_modules/firebase-admin/**/*"],
  },
};

export default nextConfig;
