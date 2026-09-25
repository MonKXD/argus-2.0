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
