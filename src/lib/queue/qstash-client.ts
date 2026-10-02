import { Client, Receiver } from "@upstash/qstash";

import { env } from "@/lib/env";

/**
 * T-6.03 (queue-based Mode B, TQ-4): lazy singletons, same pattern as
 * `src/lib/ai/client.ts`'s Anthropic SDK client and `createLlm()` — built
 * only when `ORCHESTRATION_MODE="queue"` actually calls one of these, so
 * inline-mode (the default) never needs QStash credentials configured.
 */

let client: Client | undefined;

export function getQstashClient(): Client {
  client ??= new Client({ token: env.QSTASH_TOKEN! });
  return client;
}

let receiver: Receiver | undefined;

export function getQstashReceiver(): Receiver {
  receiver ??= new Receiver({
    currentSigningKey: env.QSTASH_CURRENT_SIGNING_KEY!,
    nextSigningKey: env.QSTASH_NEXT_SIGNING_KEY!,
  });
  return receiver;
}

export interface RunStepMessage {
  analysisId: string;
  runId: string;
}

/**
 * Publishes one `RunStepMessage` to `POST /api/queue/run-step`. Called both
 * to kick off a queue-mode run (`POST .../runs`, `.../resume`) and, by the
 * run-step route itself, to chain to the next chunk — the same message
 * shape and destination either way, so the handler can't tell a first
 * invocation from a continuation except by reading the `Run` document's own
 * `steps`/`queueState`, which is exactly how `executeRunChunk` already
 * decides what to do next.
 */
export async function publishRunStep(message: RunStepMessage): Promise<void> {
  await getQstashClient().publishJSON({
    url: `${env.APP_URL}/api/queue/run-step`,
    body: message,
    retries: 3,
  });
}
