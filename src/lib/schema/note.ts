import { z } from "zod";

import { idOf, Iso } from "@/lib/schema/ids";

/**
 * T-6.14 (FR-RPT-20, "user notes on sections"). Verbatim from SCHEMA.md
 * section 6's already-specified `analyses/{id}/notes/{noteId}` shape:
 * `{ sectionKey, text, createdAt }`. `sectionKey` is one of
 * `REPORT_SECTIONS`'s own hyphenated slugs (`src/lib/report-sections.ts`,
 * e.g. "founder-team") — the same public section identifier the section
 * nav and deep-link hashes already use, not the underscored key
 * `evidenceStats.bySection` uses internally. Validated against the real
 * section list at the route boundary (R-COD-02), not duplicated here as a
 * second enum, since `report-sections.ts` is presentation data outside
 * `src/lib/schema`.
 */
export const Note = z.object({
  id: idOf("note"),
  analysisId: idOf("ana"),
  sectionKey: z.string().max(60),
  text: z.string().min(1).max(1000),
  createdAt: Iso,
});

export type Note = z.infer<typeof Note>;
