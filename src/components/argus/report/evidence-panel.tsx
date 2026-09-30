"use client";

import { EvidenceRailContent } from "@/components/argus/evidence-rail";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { useMediaQuery } from "@/hooks/use-media-query";
import type { Claim } from "@/lib/schema/claims";
import type { Evidence, Fact, Source } from "@/lib/schema/evidence";

interface EvidencePanelProps {
  selected: Claim | null;
  onClose: () => void;
  evidence: Evidence[];
  sources: Source[];
  facts: Fact[];
}

/**
 * DESIGN section 6: "EvidenceRail and Sheet | 360px column on desktop;
 * bottom sheet on narrow screens." Renders both pieces of chrome —
 * `EvidenceRailContent` is the same either way, only the wrapper differs —
 * and uses `useMediaQuery` (not CSS alone) to decide which one is actually
 * live, per D-032's own deferral: a bottom sheet that only `showModal()`s
 * below `xl` (1280px) — DESIGN section 10's responsive table draws the
 * docked-column threshold at 1280 ("1280 and up: full three-column
 * report"), not 1024 (T-4.13; the docked rail and the 3-column grid moved
 * together from `lg` to `xl` in the same change).
 */
function EvidencePanel({ selected, onClose, evidence, sources, facts }: EvidencePanelProps) {
  const isNarrow = !useMediaQuery("(min-width: 1280px)");

  return (
    <>
      <aside className="hidden xl:sticky xl:top-6 xl:block xl:h-fit xl:border-l xl:border-hairline xl:pl-8">
        {selected ? (
          <EvidenceRailContent
            claim={selected}
            evidence={evidence}
            sources={sources}
            facts={facts}
          />
        ) : (
          <p className="text-ui-sm text-mist">Select a claim to see its evidence.</p>
        )}
      </aside>

      <Sheet open={isNarrow && selected !== null} onOpenChange={(open) => !open && onClose()}>
        <SheetContent side="bottom" className="max-h-[80vh] overflow-y-auto">
          <SheetTitle className="sr-only">Evidence</SheetTitle>
          {isNarrow && selected && (
            <EvidenceRailContent
              claim={selected}
              evidence={evidence}
              sources={sources}
              facts={facts}
            />
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}

export { EvidencePanel };
