"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

import "./globals.css";

/**
 * T-6.08 (observability, NFR-08): Next's own file convention for catching an
 * error the root layout itself throws — React render errors anywhere else
 * are caught by Sentry's automatic instrumentation via `onRequestError`
 * (instrumentation.ts), but a root-layout error replaces the whole tree, so
 * this is the one place that still needs its own `<html>`/`<body>` (Next's
 * documented requirement for this file) and its own explicit capture call.
 */
export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full flex-col items-center justify-center gap-4 p-6 text-center text-foreground">
        <h1 className="text-h2 font-medium">Something went wrong.</h1>
        <p className="max-w-md text-ui text-mist">
          The error has been reported. Try reloading the page, or come back in a few minutes.
        </p>
      </body>
    </html>
  );
}
