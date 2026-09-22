import { z } from "zod";

import { idOf, Iso } from "@/lib/schema/ids";

/** Verbatim from docs/SCHEMA.md section 6 (Activity). */

export const Activity = z.object({
  id: idOf("act"),
  ownerId: z.string(),
  type: z.enum([
    "ANALYSIS_CREATED",
    "SOURCE_ADDED",
    "RUN_STARTED",
    "RUN_COMPLETED",
    "RUN_FAILED",
    "REPORT_EXPORTED",
    "COMPARISON_CREATED",
    "WATCHLIST_ADDED",
    "WATCHLIST_REMOVED",
    "SIGNAL_DETECTED",
  ]),
  analysisId: idOf("ana").optional(),
  message: z.string().max(200),
  createdAt: Iso,
});

export type Activity = z.infer<typeof Activity>;
