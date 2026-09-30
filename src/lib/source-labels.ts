import type { SourceType } from "@/lib/schema/enums";

export const SOURCE_TYPE_LABEL: Record<SourceType, string> = {
  PITCH_DECK: "Pitch deck",
  FINANCIAL_DOC: "Financial document",
  COMPANY_DOC: "Company document",
  WEBSITE: "Website",
  WEB_RESEARCH: "Web research",
  USER_NOTES: "Notes",
};
