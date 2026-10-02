import { after } from "next/server";

import { executeRun } from "@/lib/analysis/run-pipeline";
import { registerRun, unregisterRun } from "@/lib/analysis/run-registry";
import { env } from "@/lib/env";
import { publishRunStep } from "@/lib/queue/qstash-client";

import type { Firestore } from "firebase-admin/firestore";

export interface TriggerRunArgs {
  analysisId: string;
  runId: string;
}

/**
 * T-6.03 (TQ-4): the one branch point between Mode A (inline, default) and
 * Mode B (queue) — shared by `POST .../runs` and `.../runs/:runId/resume`,
 * the two routes that start a run, so the mode switch lives in exactly one
 * place rather than being duplicated in both. Mode A keeps its existing
 * `after()`-runs-`executeRun()`-to-completion shape unchanged; Mode B
 * publishes the first `RunStepMessage` and returns immediately — the
 * route's own 202 response follows either way, since progress is always
 * read from the `Run` document's own Firestore listener (D-010), never
 * from this call's return value.
 */
export async function triggerRun(db: Firestore, args: TriggerRunArgs): Promise<void> {
  if (env.ORCHESTRATION_MODE === "queue") {
    await publishRunStep(args);
    return;
  }

  const controller = registerRun(args.runId);
  after(() =>
    executeRun(db, { ...args, signal: controller.signal }).finally(() => unregisterRun(args.runId)),
  );
}
