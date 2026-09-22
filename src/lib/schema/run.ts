import { z } from "zod";

import { RunStatus, StageProfile, StepStatus } from "@/lib/schema/enums";
import { idOf, Iso } from "@/lib/schema/ids";
import { RunWarning } from "@/lib/schema/report";

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
});

export type Usage = z.infer<typeof Usage>;
export type StepState = z.infer<typeof StepState>;
export type Run = z.infer<typeof Run>;
