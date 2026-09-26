import type { Severity } from "@/lib/schema/enums";

/** DESIGN section 3.2's evidence-spectrum meaning-colours, the severity half: "Assumption… medium severity", "Ember… critical severity", "Ember-high… high severity". No colour is named for LOW, so it stays a neutral secondary-text tone rather than inventing a new token (R-UI-02). */
export const SEVERITY_CLASS: Record<Severity, string> = {
  LOW: "text-mist",
  MEDIUM: "text-assumption",
  HIGH: "text-ember-high",
  CRITICAL: "text-ember",
};
