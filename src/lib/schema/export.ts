import { z } from "zod";

import { idOf, Iso } from "@/lib/schema/ids";

/** Verbatim from docs/SCHEMA.md section 6 (Export). */

export const Export = z.object({
  id: idOf("exp"),
  ownerId: z.string(),
  analysisId: idOf("ana"),
  reportId: idOf("rpt"),
  format: z.enum(["MD", "JSON", "PDF"]),
  storagePath: z.string(),
  createdAt: Iso,
  expiresAt: Iso,
});

export type Export = z.infer<typeof Export>;
