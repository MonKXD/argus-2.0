import pino, { type LoggerOptions } from "pino";

import { env } from "@/lib/env";

/**
 * Redaction is defence in depth: the real rule is R-SEC-04 / RULES "Never" —
 * never pass document text, quotes, prompts or model output as log fields in
 * the first place. Log IDs, counts, hashes and durations. Exported
 * separately from `logger` so tests can point a pino instance built from
 * these options at an in-memory stream instead of stdout.
 */
const REDACTED_FIELDS = [
  "apiKey",
  "password",
  "token",
  "privateKey",
  "sessionCookie",
  "ANTHROPIC_API_KEY",
  "FIREBASE_PRIVATE_KEY",
];

export const loggerOptions: LoggerOptions = {
  level: env.LOG_LEVEL,
  redact: {
    // Each field name is redacted at the top level and one level deep
    // (e.g. under `req`, `user`, `config`), since fast-redact's `*` wildcard
    // only matches a single level.
    paths: [
      "req.headers.authorization",
      "req.headers.cookie",
      ...REDACTED_FIELDS,
      ...REDACTED_FIELDS.map((field) => `*.${field}`),
    ],
    censor: "[REDACTED]",
  },
  transport:
    env.NODE_ENV === "development"
      ? {
          target: "pino-pretty",
          options: { colorize: true, translateTime: "HH:MM:ss", ignore: "pid,hostname" },
        }
      : undefined,
};

/** Server-only structured logger (`env` throws if imported into client code). */
export const logger = pino(loggerOptions);
