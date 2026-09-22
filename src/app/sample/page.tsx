"use client";

import { useState } from "react";

import { ClaimInline } from "@/components/argus/claim-inline";
import { DemoBanner } from "@/components/argus/demo-banner";
import { EvidenceRailContent } from "@/components/argus/evidence-rail";
import { DimensionRadar } from "@/components/charts/dimension-radar";
import { ScoreGauge } from "@/components/charts/score-gauge";
import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteHeader } from "@/components/marketing/site-header";
import {
  demoDimensions,
  demoEvidence,
  demoFacts,
  demoReport,
  demoSources,
  loopwellAnalysis,
} from "@/demo";
import type { Claim } from "@/lib/schema/claims";

/**
 * APP_FLOW section 5.1 / TRACKER T-1.12: "score, radar, two sections with
 * claims and evidence rail." FR-LND-02: a report rendered with real product
 * components from a clearly labelled fictional dataset — DemoBanner covers
 * the labelling.
 *
 * Evidence rail: a docked 360px column on wide screens (lg+, DESIGN section
 * 6), the same content reflowing inline below the sections on narrow
 * screens via plain CSS grid placement — no overlay/sheet here. A real
 * modal sheet needs a viewport check to avoid trapping focus in a hidden
 * dialog on desktop; that's T-4.08's job once there's a full report page to
 * justify the complexity, not this preview's.
 */
export default function SamplePage() {
  const [selected, setSelected] = useState<Claim | null>(
    demoReport.narrative.executiveSummary[0] ?? null,
  );

  return (
    <>
      <SiteHeader />
      <DemoBanner />
      <main className="mx-auto max-w-[1360px] px-4 py-12 lg:px-8">
        <p className="text-ui-sm text-mist">Sample report</p>
        <h1 className="mt-1 font-serif text-h1 text-foreground">{loopwellAnalysis.startup.name}</h1>
        <p className="mt-1 text-ui text-mist">
          {loopwellAnalysis.startup.stage} · {loopwellAnalysis.startup.sector}
        </p>

        <div className="mt-8 flex flex-wrap gap-8">
          <ScoreGauge
            score={demoReport.overall.score ?? 0}
            confidence={demoReport.overall.confidence}
          />
          <DimensionRadar
            scores={Object.fromEntries(
              demoDimensions.map((d) => [
                d.dimension,
                { score: d.score, confidence: d.confidence },
              ]),
            )}
          />
        </div>

        <div className="mt-12 lg:grid lg:grid-cols-[1fr_360px] lg:gap-12">
          <div className="flex flex-col gap-10">
            <section>
              <h2 className="font-serif text-h3 text-foreground">Executive summary</h2>
              <div className="mt-4 flex flex-col gap-3">
                {demoReport.narrative.executiveSummary.map((claim) => (
                  <ClaimInline
                    key={claim.id}
                    claim={claim}
                    selected={selected?.id === claim.id}
                    onSelect={setSelected}
                  />
                ))}
              </div>
            </section>

            <section>
              <h2 className="font-serif text-h3 text-foreground">Investment overview</h2>
              <div className="mt-4 flex flex-col gap-3">
                {demoReport.narrative.investmentOverview.map((claim) => (
                  <ClaimInline
                    key={claim.id}
                    claim={claim}
                    selected={selected?.id === claim.id}
                    onSelect={setSelected}
                  />
                ))}
              </div>
            </section>
          </div>

          <aside className="mt-10 lg:mt-0 lg:border-l lg:border-hairline lg:pl-8">
            {selected ? (
              <EvidenceRailContent
                claim={selected}
                evidence={demoEvidence}
                sources={demoSources}
                facts={demoFacts}
              />
            ) : (
              <p className="text-ui-sm text-mist">Select a claim to see its evidence.</p>
            )}
          </aside>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
