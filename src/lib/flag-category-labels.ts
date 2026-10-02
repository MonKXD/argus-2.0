import type { FlagCategory } from "@/lib/schema/enums";

/** No existing label map for `FlagCategory` — T-5.09's dashboard "common
 * risk categories" panel is the first UI surface to show a flag's category
 * rather than just its severity/title/description (report-shell.tsx's own
 * section 11). Sentence-case, matching R-UI-11's vocabulary convention. */
export const FLAG_CATEGORY_LABEL: Record<FlagCategory, string> = {
  INCONSISTENCY: "Inconsistency",
  UNVERIFIABLE_CLAIM: "Unverifiable claim",
  FOUNDER: "Founder",
  MARKET: "Market",
  LEGAL_REGULATORY: "Legal and regulatory",
  FINANCIAL: "Financial",
  TRACTION: "Traction",
  PRODUCT_TECH: "Product and technology",
  COMPETITION: "Competition",
  GOVERNANCE: "Governance",
  SOURCE_INTEGRITY: "Source integrity",
  OTHER: "Other",
};
