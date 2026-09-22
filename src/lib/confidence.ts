/**
 * Confidence labelling (AI_SPEC section 5.3): "below 0.35 Low, 0.35 to 0.65
 * Medium, above 0.65 High." Shared by ScoreGauge and DimensionRadar (which
 * also uses the 0.35 threshold for its dashed-edge/hollow-vertex styling).
 */

export type ConfidenceLabel = "Low" | "Medium" | "High";

export function confidenceLabel(confidence: number): ConfidenceLabel {
  if (confidence < 0.35) return "Low";
  if (confidence <= 0.65) return "Medium";
  return "High";
}

export const LOW_CONFIDENCE_THRESHOLD = 0.35;
