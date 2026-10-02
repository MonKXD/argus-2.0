import type { Signal } from "@/lib/schema/signal";

/**
 * T-6.02 (FR-WCH-03): "impact tags" for the signal feed. Plain text, no new
 * colour — DESIGN reserves chromatic colour for the evidence spectrum
 * (D-012), not sentiment, and the radar overlay (D-083) already set the
 * precedent of telling things apart without inventing a colour.
 */
export const SIGNAL_IMPACT_LABEL: Record<Signal["impact"], string> = {
  POSITIVE: "Positive",
  NEGATIVE: "Negative",
  NEUTRAL: "Neutral",
  UNCLEAR: "Unclear",
};
