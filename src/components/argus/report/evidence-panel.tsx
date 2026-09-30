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
 * below `lg` (1024px), never on desktop where the docked column already
 * shows the same content.
 */
function EvidencePanel({ selected, onClose, evidence, sources, facts }: EvidencePanelProps) {
  const isNarrow = !useMediaQuery("(min-width: 1024px)");

  return (
    <>
      <aside className="hidden lg:sticky lg:top-6 lg:block lg:h-fit lg:border-l lg:border-hairline lg:pl-8">
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
