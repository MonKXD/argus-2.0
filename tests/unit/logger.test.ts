import { Writable } from "node:stream";

import pino from "pino";
import { describe, expect, it } from "vitest";

import { loggerOptions } from "@/lib/logger";

function captureLogger() {
  const lines: string[] = [];
  const stream = new Writable({
    write(chunk, _encoding, callback) {
      lines.push(chunk.toString());
      callback();
    },
  });
  const testLogger = pino(loggerOptions, stream);
  return { logger: testLogger, lines };
}

describe("logger redaction", () => {
  it("censors known secret-shaped fields (R-SEC-04)", () => {
    const { logger, lines } = captureLogger();

    logger.info({ apiKey: "sk-super-secret", userId: "usr_123" }, "request handled");

    const entry = JSON.parse(lines[0]);
    expect(entry.apiKey).toBe("[REDACTED]");
    expect(entry.userId).toBe("usr_123");
  });

  it("censors an authorization header", () => {
    const { logger, lines } = captureLogger();

    logger.info({ req: { headers: { authorization: "Bearer secret-token" } } }, "handled");

    const entry = JSON.parse(lines[0]);
    expect(entry.req.headers.authorization).toBe("[REDACTED]");
  });
});
