import { z } from "zod";

import { AnalysisStatus, Severity, Stage, StageProfile } from "@/lib/schema/enums";
import { idOf, Iso } from "@/lib/schema/ids";

/** Verbatim from docs/SCHEMA.md section 5 (Analysis), with `z.url()` per the pinned Zod's current API. */

export const Analysis = z.object({
  id: idOf("ana"),
  ownerId: z.string(),
  startup: z.object({
    name: z.string().min(1).max(120),
    website: z.url().optional(),
    oneLiner: z.string().max(240).optional(),
    stage: Stage.default("UNKNOWN"),
    sector: z.string().max(80).optional(),
    hqCountry: z.string().length(2).optional(),
  }),
  status: AnalysisStatus,
  options: z.object({
    webResearch: z.boolean(),
    stageProfile: StageProfile.optional(),
    analystFocus: z.string().max(500).optional(),
  }),
  latest: z
    .object({
      reportId: idOf("rpt"),
      version: z.number().int(),
      overallScore: z.number().nullable(),
      confidence: z.number(),
      label: z.enum(["SCORED", "INSUFFICIENT_EVIDENCE"]),
      generatedAt: Iso,
      topFlagSeverity: Severity.nullable(),
    })
    .nullable(),
  currentRunId: idOf("run").nullable(),
  tags: z.array(z.string().max(32)).max(10),
  isWatchlisted: z.boolean(),
  isDemo: z.boolean().default(false),
  createdAt: Iso,
  updatedAt: Iso,
  archivedAt: Iso.nullable(),
});

export type Analysis = z.infer<typeof Analysis>;
