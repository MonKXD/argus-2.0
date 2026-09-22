import { z } from "zod";

import { DimensionKey } from "@/lib/schema/enums";
import { idOf, Iso } from "@/lib/schema/ids";

/** Verbatim from docs/SCHEMA.md section 6 (Signal), with `z.url()` per D-027. */

export const Signal = z.object({
  id: idOf("sig"),
  analysisId: idOf("ana"),
  title: z.string(),
  url: z.url(),
  publisher: z.string().optional(),
  publishedAt: Iso.optional(),
  summary: z.string().max(400),
  impact: z.enum(["POSITIVE", "NEGATIVE", "NEUTRAL", "UNCLEAR"]),
  relatedDimension: DimensionKey.optional(),
  evidenceId: idOf("ev"),
  retrievedAt: Iso,
  seenAt: Iso.optional(),
});

export type Signal = z.infer<typeof Signal>;
