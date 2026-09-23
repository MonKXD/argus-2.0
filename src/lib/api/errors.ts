import { NextResponse } from "next/server";
import { z } from "zod";

import { logger } from "@/lib/logger";

/** TRD section 7's fixed error-code vocabulary. Route handlers built after
 * T-3.01 (T-3.04 onward) add error classes for the remaining codes as they
 * need them — only UNAUTHENTICATED and FORBIDDEN have a caller today. */
export const ApiErrorCode = z.enum([
  "UNAUTHENTICATED",
  "FORBIDDEN",
  "NOT_FOUND",
  "VALIDATION_FAILED",
  "LIMIT_EXCEEDED",
  "CONFLICT",
  "UPSTREAM_FAILED",
  "INTERNAL",
]);
export type ApiErrorCode = z.infer<typeof ApiErrorCode>;

const STATUS_BY_CODE: Record<ApiErrorCode, number> = {
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  VALIDATION_FAILED: 400,
  LIMIT_EXCEEDED: 429,
  CONFLICT: 409,
  UPSTREAM_FAILED: 502,
  INTERNAL: 500,
};

/** Base class for every typed API error (R-COD-11: typed errors, never swallowed). */
export class ApiError extends Error {
  readonly code: ApiErrorCode;
  readonly status: number;
  readonly details?: Record<string, unknown>;

  constructor(code: ApiErrorCode, message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = STATUS_BY_CODE[code];
    this.details = details;
  }
}

export class UnauthenticatedError extends ApiError {
  constructor(message = "Sign in to continue.") {
    super("UNAUTHENTICATED", message);
    this.name = "UnauthenticatedError";
  }
}

export class ForbiddenError extends ApiError {
  constructor(message = "You don't have access to this.") {
    super("FORBIDDEN", message);
    this.name = "ForbiddenError";
  }
}

/** The standard error envelope (TRD section 7). */
export function toErrorEnvelope(error: ApiError): {
  error: { code: ApiErrorCode; message: string; details: Record<string, unknown> };
} {
  return { error: { code: error.code, message: error.message, details: error.details ?? {} } };
}

/**
 * Route handlers call this from a single catch block. An ApiError becomes
 * its own envelope and status; anything else is an unexpected failure, so
 * it's logged (never with the error's own message, which could echo request
 * content — R-SEC-04) and reported as INTERNAL without leaking internals.
 */
export function handleApiError(error: unknown): NextResponse {
  if (error instanceof ApiError) {
    return NextResponse.json(toErrorEnvelope(error), { status: error.status });
  }

  logger.error({ errorName: error instanceof Error ? error.name : "unknown" }, "unhandled API error");
  const internal = new ApiError("INTERNAL", "Something went wrong. Try again.");
  return NextResponse.json(toErrorEnvelope(internal), { status: internal.status });
}
