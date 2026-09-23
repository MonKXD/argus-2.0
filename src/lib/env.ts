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

const serverSchema = z
  .object({
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
    APP_URL: z.url(),
    LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),
    SESSION_COOKIE_NAME: z.string().min(1).default("argus_session"),
    SESSION_MAX_AGE_DAYS: z.coerce.number().int().positive().default(5),

    // Which LLM provider src/lib/ai's createLlm() wires up (R-AI-10: model
    // IDs from env only, never hard-coded — this extends the same principle
    // to the provider choice itself). Both providers stay fully implemented
    // behind the provider-agnostic LLM interface (R-ARC-08) regardless of
    // which is active, so switching back is a one-variable change, not a
    // code change. Default is "gemini" (a free tier) rather than
    // "anthropic" (paid) — see PROJECT_MEMORY D-064.
    LLM_PROVIDER: z.enum(["anthropic", "gemini"]).default("gemini"),

    // Required only when LLM_PROVIDER="anthropic" (see the .superRefine below).
    ANTHROPIC_API_KEY: z.string().min(1).optional(),
    ANTHROPIC_MODEL_ANALYSIS: z.string().min(1).optional(),
    ANTHROPIC_MODEL_SYNTHESIS: z.string().min(1).optional(),
    ANTHROPIC_MODEL_FAST: z.string().min(1).optional(),

    // Required only when LLM_PROVIDER="gemini" (see the .superRefine below).
    GEMINI_API_KEY: z.string().min(1).optional(),
    GEMINI_MODEL_ANALYSIS: z.string().min(1).optional(),
    GEMINI_MODEL_SYNTHESIS: z.string().min(1).optional(),
    GEMINI_MODEL_FAST: z.string().min(1).optional(),

    FIREBASE_PROJECT_ID: z.string().min(1),
    // Server-side mirror of NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET (T-3.06):
    // the Admin SDK needs its own copy since it never reads NEXT_PUBLIC_*
    // vars, and R-COD-06 keeps every env read behind this one file.
    FIREBASE_STORAGE_BUCKET: z.string().min(1),
    // Optional here; the .superRefine below requires both unless
    // USE_FIREBASE_EMULATORS is true, so emulator-only local dev (T-0.06)
    // doesn't need real Firebase Admin credentials.
    FIREBASE_CLIENT_EMAIL: z.email().optional(),
    FIREBASE_PRIVATE_KEY: z.string().min(1).optional(),

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
  })
  .superRefine((data, ctx) => {
    if (!data.USE_FIREBASE_EMULATORS) {
      for (const field of ["FIREBASE_CLIENT_EMAIL", "FIREBASE_PRIVATE_KEY"] as const) {
        if (!data[field]) {
          ctx.addIssue({
            code: "custom",
            path: [field],
            message: `${field} is required unless USE_FIREBASE_EMULATORS=true`,
          });
        }
      }
    }

    const requiredFor: Record<typeof data.LLM_PROVIDER, readonly (keyof typeof data)[]> = {
      anthropic: ["ANTHROPIC_API_KEY", "ANTHROPIC_MODEL_ANALYSIS", "ANTHROPIC_MODEL_SYNTHESIS", "ANTHROPIC_MODEL_FAST"],
      gemini: ["GEMINI_API_KEY", "GEMINI_MODEL_ANALYSIS", "GEMINI_MODEL_SYNTHESIS", "GEMINI_MODEL_FAST"],
    };
    for (const field of requiredFor[data.LLM_PROVIDER]) {
      if (!data[field]) {
        ctx.addIssue({
          code: "custom",
          path: [field],
          message: `${field} is required when LLM_PROVIDER="${data.LLM_PROVIDER}"`,
        });
      }
    }
  });

const clientSchema = z.object({
  NEXT_PUBLIC_FIREBASE_API_KEY: z.string().min(1),
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: z.string().min(1),
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: z.string().min(1),
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: z.string().min(1),
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: z.string().min(1),
  NEXT_PUBLIC_FIREBASE_APP_ID: z.string().min(1),
  // Mirrors the server-only USE_FIREBASE_EMULATORS: the browser-side client
  // SDK needs its own flag to call connectAuthEmulator (T-3.01), since it
  // never sees server env vars.
  NEXT_PUBLIC_USE_FIREBASE_EMULATORS: boolFromString.default(false),
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
    NEXT_PUBLIC_USE_FIREBASE_EMULATORS: process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS,
  });
  if (!result.success) {
    throw new Error(`Invalid client environment variables:\n${formatIssues(result.error)}`);
  }
  return result.data;
}

/**
 * Server-only config: Anthropic keys, Firebase Admin credentials, limits.
 * Lazy: parsing only runs the first time a property is read, not on import.
 * Otherwise a Client Component that imports only `clientEnv` from this same
 * module would still trigger (and fail on) the server parse, since importing
 * either export evaluates the whole module. A property read of `env` still
 * fails fast with the same per-field validation error as a broken .env — it
 * just fails at first use instead of at import time.
 */
let cachedServerEnv: ServerEnv | undefined;
export const env: ServerEnv = new Proxy({} as ServerEnv, {
  get(_target, prop, receiver) {
    cachedServerEnv ??= parseServerEnv();
    return Reflect.get(cachedServerEnv, prop, receiver);
  },
});

/**
 * Public config safe for Client Components: Firebase web config only.
 * Lazy for the same reason `env` is (see above) — symmetrically: a
 * server-only module that imports this file only for `env` must not also
 * trigger an eager `NEXT_PUBLIC_*` parse, which fails during Next's
 * page-data collection for any route that doesn't have client env vars set
 * (e.g. a CI or preview build with no .env.local yet).
 */
let cachedClientEnv: ClientEnv | undefined;
export const clientEnv: ClientEnv = new Proxy({} as ClientEnv, {
  get(_target, prop, receiver) {
    cachedClientEnv ??= parseClientEnv();
    return Reflect.get(cachedClientEnv, prop, receiver);
  },
});
