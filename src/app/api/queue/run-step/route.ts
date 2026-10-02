import { NextResponse } from "next/server";
import { z } from "zod";

import { executeRunChunk } from "@/lib/analysis/run-pipeline-queue";
import { handleApiError } from "@/lib/api/errors";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { publishRunStep, getQstashReceiver } from "@/lib/queue/qstash-client";
import { getAdminFirestore } from "@/lib/repos/admin-firestore";


/**
 * T-6.03 (queue-based Mode B, TQ-4): QStash delivers one `RunStepMessage`
 * per chunk to this route — never a signed-in user, so this is verified via
 * QStash's own request-signing (`upstash-signature` header, the SDK's
 * documented `Receiver.verify()`), the same "service-to-service auth
 * instead of requireUser()" shape as T-6.01's cron route. 55s, a small
 * margin under the project's own 60s Hobby-plan ceiling (D-070) — a chunk
 * running long enough to approach that is exactly the case chunking exists
 * to avoid, so this is a safety margin, not an expected outcome.
 */
export const maxDuration = 55;

const RunStepBody = z.object({ analysisId: z.string().min(1), runId: z.string().min(1) });

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get("upstash-signature");
    if (!signature) {
      return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Not authorized." } }, { status: 401 });
    }

    const valid = await getQstashReceiver()
      .verify({ signature, body: rawBody, url: `${env.APP_URL}/api/queue/run-step` })
      .catch(() => false);
    if (!valid) {
      return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: "Not authorized." } }, { status: 401 });
    }

    const { analysisId, runId } = RunStepBody.parse(JSON.parse(rawBody));
    const db = getAdminFirestore();
    const controller = new AbortController();

    const result = await executeRunChunk(db, { analysisId, runId, signal: controller.signal });
    if (!result.done) {
      await publishRunStep({ analysisId, runId });
    }

    return NextResponse.json({ done: result.done });
  } catch (error) {
    logger.error({ errorName: error instanceof Error ? error.name : "unknown" }, "queue/run-step: chunk failed");
    return handleApiError(error);
  }
}
