import type { Instrumentation } from "next";

// T-6.08 (observability, NFR-08): registers Sentry separately per runtime
// (Next.js's own documented pattern — the Node and Edge Sentry SDKs are
// different builds) and wires `onRequestError` so every server-side error
// Next itself captures (route handlers, Server Components, middleware) is
// reported, not just ones an explicit try/catch happens to log. A missing
// `SENTRY_DSN` makes `Sentry.init` a no-op (see instrumentation-node.ts/
// instrumentation-edge.ts) rather than a startup failure.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./instrumentation-node");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./instrumentation-edge");
  }
}

export const onRequestError: Instrumentation.onRequestError = async (error, request, context) => {
  const Sentry = await import("@sentry/nextjs");
  Sentry.captureRequestError(error, request, context);
};
