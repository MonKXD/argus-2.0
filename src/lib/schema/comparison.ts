import { z } from "zod";

import { Claim } from "@/lib/schema/claims";
import { idOf, Iso } from "@/lib/schema/ids";

/** Verbatim from docs/SCHEMA.md section 6 (Comparison). */

export const Comparison = z.object({
  id: idOf("cmp"),
  ownerId: z.string(),
  name: z.string().max(120),
  items: z
    .array(
      z.object({
        analysisId: idOf("ana"),
        reportId: idOf("rpt"),
        label: z.string(),
        deleted: z.boolean().default(false), // snapshot label if the analysis is deleted
      }),
    )
    .min(2)
    .max(4),
  scoringVersions: z.array(z.string()),
  narrative: z.array(Claim).optional(), // P2
  createdAt: Iso,
});

export type Comparison = z.infer<typeof Comparison>;
