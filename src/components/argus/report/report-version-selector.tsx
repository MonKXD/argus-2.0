"use client";

import { useRouter } from "next/navigation";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatDate } from "@/lib/format";

interface ReportVersionSummary {
  id: string;
  version: number;
  generatedAt: string;
  score: number | null;
}

interface ReportVersionSelectorProps {
  analysisId: string;
  /** Newest first, matching `ReportRepo.list()`'s own order. */
  versions: ReportVersionSummary[];
  currentVersion: number;
}

function scoreDeltaLabel(score: number | null, previousScore: number | null): string | null {
  if (score === null || previousScore === null) return null;
  const delta = score - previousScore;
  if (delta === 0) return "no change";
  return delta > 0 ? `+${delta}` : `${delta}`;
}

/**
 * APP_FLOW 5.5: "Version selector switches reports; older versions are
 * read-only and marked as such." FR-RPT-19: "view history and score
 * changes" — each option shows that version's own score and its change
 * from the version before it, so the history is visible without opening
 * every version in turn. Hidden entirely for a single-version analysis
 * (the common case for a first run) rather than showing a selector with
 * nothing to select between.
 */
function ReportVersionSelector({ analysisId, versions, currentVersion }: ReportVersionSelectorProps) {
  const router = useRouter();

  if (versions.length <= 1) {
    return null;
  }

  return (
    <Select
      value={String(currentVersion)}
      onValueChange={(value) => router.push(`/app/analyses/${analysisId}?version=${value}`)}
    >
      <SelectTrigger aria-label="Report version" size="sm">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {versions.map((version, index) => {
          const previous = versions[index + 1];
          const delta = scoreDeltaLabel(version.score, previous?.score ?? null);
          return (
            <SelectItem key={version.id} value={String(version.version)}>
              Version {version.version} · {formatDate(version.generatedAt)}
              {version.score !== null ? ` · Score ${version.score}` : " · Not scored"}
              {delta ? ` (${delta})` : ""}
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}

export { ReportVersionSelector };
export type { ReportVersionSummary };
