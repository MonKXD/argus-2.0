import { z } from "zod";

import { Flag } from "@/lib/schema/claims";
import { DimensionKey, RunStatus, StageProfile, StepStatus } from "@/lib/schema/enums";
import { idOf, Iso } from "@/lib/schema/ids";
import { Overall, RunWarning } from "@/lib/schema/report";

/** Verbatim from docs/SCHEMA.md section 5 (Run). */

export const Usage = z.object({
  inputTokens: z.number(),
  outputTokens: z.number(),
  cacheReadTokens: z.number().default(0),
  cacheWriteTokens: z.number().default(0),
  estimatedCostUsd: z.number(),
});

export const StepState = z.object({
  status: StepStatus,
  attempt: z.number().int().nonnegative(),
  startedAt: Iso.optional(),
  finishedAt: Iso.optional(),
  usage: Usage.optional(),
  counters: z.record(z.string(), z.number()).optional(),
  error: z.object({ code: z.string(), message: z.string() }).optional(),
});

/**
 * T-6.03 (queue-based Mode B, TQ-4): intermediate state carried on the
 * `Run` document between QStash-chained chunk invocations, which share no
 * memory with each other. Deliberately small — dimension analyses
 * themselves (with their claims and quotes) are persisted to the real
 * `reports/{reportId}/dimensions/{key}` subcollection as soon as ANALYZE
 * finishes, not kept here, for the same 1 MiB document-size reason
 * `SCHEMA.md` already gives for that subcollection existing at all
 * (PROJECT_MEMORY section 4). Cleared once the run finishes (DONE/PARTIAL/
 * FAILED/CANCELLED) — it's scratch space for an in-flight run, not part of
 * its permanent record. Mode A (`executeRun`) never reads or writes this
 * field; only Mode B's chunked orchestrator does.
 */
export const RunQueueState = z.object({
  reportId: idOf("rpt"),
  flags: z.array(Flag),
  warnings: z.array(RunWarning),
  usage: z.object({
    inputTokens: z.number(),
    outputTokens: z.number(),
    cacheReadTokens: z.number(),
    cacheWriteTokens: z.number(),
    estimatedCostUsd: z.number(),
  }),
  overall: Overall.optional(),
  failedDimensions: z.array(z.object({ dimension: DimensionKey, error: z.string() })).optional(),
});

export const Run = z.object({
  id: idOf("run"),
  analysisId: idOf("ana"),
  ownerId: z.string(),
  status: RunStatus,
  options: z.object({ webResearch: z.boolean(), stageProfile: StageProfile }),
  steps: z.record(z.string(), StepState),
  dimensionStatus: z.record(z.string(), StepStatus),
  modelIds: z.object({ analysis: z.string(), synthesis: z.string(), fast: z.string() }),
  promptVersion: z.string(),
  scoringVersion: z.string(),
  usage: Usage,
  warnings: z.array(RunWarning),
  cancelRequested: z.boolean().default(false),
  reportId: idOf("rpt").nullable(),
  error: z.object({ code: z.string(), message: z.string() }).optional(),
  startedAt: Iso,
  finishedAt: Iso.optional(),
  /** T-6.03: present only while a queue-mode (Mode B) run is in flight. */
  queueState: RunQueueState.optional(),
});

export type Usage = z.infer<typeof Usage>;
export type StepState = z.infer<typeof StepState>;
export type RunQueueState = z.infer<typeof RunQueueState>;
export type Run = z.infer<typeof Run>;
