"use client";

import { Button } from "@/components/ui/button";
import { useUpdateFlagStatus } from "@/hooks/use-update-flag-status";
import type { Flag } from "@/lib/schema/claims";

const FLAG_STATUS_LABEL: Record<Flag["status"], string> = {
  OPEN: "Open",
  ACKNOWLEDGED: "Acknowledged",
  DISMISSED: "Dismissed",
};

interface FlagAcknowledgeControlsProps {
  analysisId: string;
  reportId: string;
  flag: Flag;
}

/**
 * FR-RPT-21: "flag acknowledge." An `OPEN` flag gets two actions;
 * `ACKNOWLEDGED`/`DISMISSED` just shows the resulting status — no
 * "reopen" (not asked for, and nothing in the doc names it, D-060's "don't
 * build ahead of need").
 */
function FlagAcknowledgeControls({ analysisId, reportId, flag }: FlagAcknowledgeControlsProps) {
  const { updating, error, updateStatus } = useUpdateFlagStatus(analysisId, reportId, flag.id);

  if (flag.status !== "OPEN") {
    return <p className="mt-2 text-caption text-mist">{FLAG_STATUS_LABEL[flag.status]}</p>;
  }

  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={updating}
        onClick={() => void updateStatus("ACKNOWLEDGED")}
      >
        Acknowledge
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={updating}
        onClick={() => void updateStatus("DISMISSED")}
      >
        Dismiss
      </Button>
      {error && (
        <p role="alert" className="text-caption text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

export { FlagAcknowledgeControls };
