"use client";

import { ClaimInline } from "@/components/argus/claim-inline";
import { EvidenceRailContent } from "@/components/argus/evidence-rail";
import { ScoreGauge } from "@/components/charts/score-gauge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { demoDimensions, demoEvidence, demoFacts, demoReport, demoSources } from "@/demo";

// DESIGN section 5.6: "report tour (tabs: Score, Founder, Market, Risks,
// Evidence)". Built on the real Loopwell demo data, same as the hero.

function dimensionClaims(key: "founder" | "market" | "risk") {
  return demoDimensions.find((d) => d.dimension === key)?.claims ?? [];
}

function ReportTour() {
  const verifiedClaim = demoReport.narrative.executiveSummary.find((c) => c.status === "VERIFIED");

  return (
    <section className="mx-auto max-w-[1360px] px-4 py-16 lg:px-8">
      <h2 className="font-serif text-h2 text-foreground">A real report, section by section</h2>
      <Tabs defaultValue="score" className="mt-8">
        <TabsList>
          <TabsTrigger value="score">Score</TabsTrigger>
          <TabsTrigger value="founder">Founder</TabsTrigger>
          <TabsTrigger value="market">Market</TabsTrigger>
          <TabsTrigger value="risks">Risks</TabsTrigger>
          <TabsTrigger value="evidence">Evidence</TabsTrigger>
        </TabsList>

        <TabsContent value="score" className="pt-6">
          <ScoreGauge
            score={demoReport.overall.score ?? 0}
            confidence={demoReport.overall.confidence}
          />
        </TabsContent>

        <TabsContent value="founder" className="flex flex-col gap-3 pt-6">
          {dimensionClaims("founder").map((claim) => (
            <ClaimInline key={claim.id} claim={claim} />
          ))}
        </TabsContent>

        <TabsContent value="market" className="flex flex-col gap-3 pt-6">
          {dimensionClaims("market").map((claim) => (
            <ClaimInline key={claim.id} claim={claim} />
          ))}
        </TabsContent>

        <TabsContent value="risks" className="flex flex-col gap-3 pt-6">
          {dimensionClaims("risk").map((claim) => (
            <ClaimInline key={claim.id} claim={claim} />
          ))}
        </TabsContent>

        <TabsContent value="evidence" className="max-w-md pt-6">
          {verifiedClaim && (
            <EvidenceRailContent
              claim={verifiedClaim}
              evidence={demoEvidence}
              sources={demoSources}
              facts={demoFacts}
            />
          )}
        </TabsContent>
      </Tabs>
    </section>
  );
}

export { ReportTour };
