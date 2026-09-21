import { z } from "zod";

/**
 * Validated environment access (R-COD-06). Nothing outside this file reads
 * `process.env` directly. Server values fail fast at import time; client
 * values are limited to the `NEXT_PUBLIC_*` subset Next.js inlines into the
 * browser bundle.
 */

const boolFromString = z
  .string()
  .transform((value) => value.toLowerCase())
  .pipe(z.enum(["true", "false"]))
  .transform((value) => value === "true");

const serverSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  APP_URL: z.url(),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),
  SESSION_COOKIE_NAME: z.string().min(1).default("argus_session"),
  SESSION_MAX_AGE_DAYS: z.coerce.number().int().positive().default(5),

  ANTHROPIC_API_KEY: z.string().min(1),
  ANTHROPIC_MODEL_ANALYSIS: z.string().min(1),
  ANTHROPIC_MODEL_SYNTHESIS: z.string().min(1),
  ANTHROPIC_MODEL_FAST: z.string().min(1),

  FIREBASE_PROJECT_ID: z.string().min(1),
  FIREBASE_CLIENT_EMAIL: z.email(),
  FIREBASE_PRIVATE_KEY: z.string().min(1),

  USE_FIREBASE_EMULATORS: boolFromString.default(false),
  FIRESTORE_EMULATOR_HOST: z.string().min(1).optional(),
  FIREBASE_AUTH_EMULATOR_HOST: z.string().min(1).optional(),
  FIREBASE_STORAGE_EMULATOR_HOST: z.string().min(1).optional(),

  MAX_UPLOAD_MB: z.coerce.number().positive().default(25),
  MAX_PDF_PAGES: z.coerce.number().int().positive().default(100),
  DAILY_ANALYSIS_LIMIT: z.coerce.number().int().positive().default(10),
  MAX_CONCURRENT_RUNS: z.coerce.number().int().positive().default(2),
  RUN_TOKEN_BUDGET: z.coerce.number().int().positive().default(600_000),
  ANALYZE_CONCURRENCY: z.coerce.number().int().positive().default(4),

  FEATURE_WEB_RESEARCH: boolFromString.default(true),
  FEATURE_MONITORING: boolFromString.default(false),
});

const clientSchema = z.object({
  NEXT_PUBLIC_FIREBASE_API_KEY: z.string().min(1),
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: z.string().min(1),
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: z.string().min(1),
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: z.string().min(1),
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: z.string().min(1),
  NEXT_PUBLIC_FIREBASE_APP_ID: z.string().min(1),
});

export type ServerEnv = z.infer<typeof serverSchema>;
export type ClientEnv = z.infer<typeof clientSchema>;

function formatIssues(error: z.ZodError): string {
  return error.issues
    .map((issue) => `  - ${issue.path.join(".") || "(root)"}: ${issue.message}`)
    .join("\n");
}

function parseServerEnv(): ServerEnv {
  const result = serverSchema.safeParse(process.env);
  if (!result.success) {
    throw new Error(`Invalid server environment variables:\n${formatIssues(result.error)}`);
  }
  return result.data;
}

function parseClientEnv(): ClientEnv {
  const result = clientSchema.safeParse({
    NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    NEXT_PUBLIC_FIREBASE_APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  });
  if (!result.success) {
    throw new Error(`Invalid client environment variables:\n${formatIssues(result.error)}`);
  }
  return result.data;
}

/**
 * Server-only config: Anthropic keys, Firebase Admin credentials, limits.
 * Importing this from a Client Component fails fast, since Next.js leaves
 * non-`NEXT_PUBLIC_*` vars undefined in the browser bundle.
 */
export const env: ServerEnv = ((): ServerEnv => {
  if (typeof window !== "undefined") {
    throw new Error("src/lib/env.ts `env` was imported into client code. Use `clientEnv` instead.");
  }
  return parseServerEnv();
})();

/** Public config safe for Client Components: Firebase web config only. */
export const clientEnv: ClientEnv = parseClientEnv();
