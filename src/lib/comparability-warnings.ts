import type { StageProfile } from "@/lib/schema/enums";
import { STAGE_PROFILE_LABEL } from "@/lib/stage-labels";

interface ComparabilityInput {
  scoringVersion: string;
  stageProfile: StageProfile;
}

/**
 * FR-CMP-04/APP_FLOW 5.6: "Warnings when stage profiles or scoring versions
 * differ; scores are not silently rescaled." Returns zero, one or two
 * warning strings — each check is independent, since the two kinds of
 * mismatch are unrelated causes (a scoring-logic version bump vs. a
 * different rubric weight profile) and a reader should see both if both
 * are true, not just the first one found.
 */
export function comparabilityWarnings(items: ComparabilityInput[]): string[] {
  const warnings: string[] = [];

  const scoringVersions = [...new Set(items.map((i) => i.scoringVersion))].sort();
  if (scoringVersions.length > 1) {
    warnings.push(
      `These startups were scored with different scoring versions (${scoringVersions.join(", ")}). Scores are not rescaled to match and may not be directly comparable.`,
    );
  }

  const stageProfiles = [...new Set(items.map((i) => i.stageProfile))]
    .map((p) => STAGE_PROFILE_LABEL[p])
    .sort();
  if (stageProfiles.length > 1) {
    warnings.push(
      `These startups were analysed under different stage profiles (${stageProfiles.join(", ")}), which weight dimensions differently. Scores are not rescaled to match.`,
    );
  }

  return warnings;
}
