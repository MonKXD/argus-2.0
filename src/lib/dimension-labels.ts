import type { DimensionKey } from "@/lib/schema/enums";

/** Exact section headings from AI_SPEC.md section 4 — the canonical display names. */
export const DIMENSION_LABEL: Record<DimensionKey, string> = {
  founder: "Founder",
  market: "Market",
  product: "Product",
  traction: "Traction",
  competitive: "Competitive",
  business_model: "Business model",
  financial: "Financial",
  risk: "Risk",
};

/** SCHEMA.md section 2's declared order — also the canonical axis order for DimensionRadar. */
export const DIMENSION_ORDER: DimensionKey[] = [
  "founder",
  "market",
  "product",
  "traction",
  "competitive",
  "business_model",
  "financial",
  "risk",
];
