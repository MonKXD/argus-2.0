"use client";

import { useState } from "react";

import { ClaimInline } from "@/components/argus/claim-inline";
import { DemoBanner } from "@/components/argus/demo-banner";
import { EmptyState } from "@/components/argus/empty-state";
import { EvidenceBar } from "@/components/argus/evidence-bar";
import { EvidenceMarker } from "@/components/argus/evidence-marker";
import { EvidenceRailContent } from "@/components/argus/evidence-rail";
import { InlineError } from "@/components/argus/inline-error";
import { ReliabilityChip } from "@/components/argus/reliability-chip";
import { StatusBadge } from "@/components/argus/status-badge";
import { TableSkeleton } from "@/components/argus/table-skeleton";
import { BarChart } from "@/components/charts/bar-chart";
import { DimensionRadar } from "@/components/charts/dimension-radar";
import { ScoreGauge } from "@/components/charts/score-gauge";
import { Sparkline } from "@/components/charts/sparkline";
import { KpiStripSkeleton } from "@/components/dashboard/kpi-strip";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
  demoAnalyses,
  demoDimensions,
  demoEvidence,
  demoFacts,
  demoReport,
  demoSources,
} from "@/demo";
import type { ClaimStatus, Reliability } from "@/lib/schema/enums";

const ALL_STATUSES: ClaimStatus[] = ["VERIFIED", "AI_ANALYSIS", "ASSUMPTION", "MISSING"];
const ALL_RELIABILITIES: Reliability[] = ["INDEPENDENT", "FIRST_PARTY", "PROVIDED"];

/**
 * Component gallery seed (T-1.17 builds this out to cover every primitive
 * and state). Dialog and Sheet are previewed here; CommandPalette (the
 * third hand-built native-<dialog> primitive) is previewed live at /app
 * instead, since it needs the real Cmd/Ctrl+K listener and topbar. All
 * three are exercised by tests/e2e/overlays.spec.ts — jsdom doesn't
 * implement showModal() (see PROJECT_MEMORY), so a real browser is the
 * only way to catch regressions in that wiring.
 */
export default function DevUiGallery() {
  return (
    <main className="flex flex-col gap-8 p-16">
      <h1 className="font-serif text-h2">Component gallery</h1>

      <section className="flex flex-col gap-2">
        <h2 className="text-h4 font-semibold">DemoBanner</h2>
        <DemoBanner />
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-h4 font-semibold">Demo dataset (T-1.08)</h2>
        <p className="text-ui-sm text-mist">
          Real fixture data from <code>src/demo/</code>, fed into the same chart components above —
          not a second implementation.
        </p>
        <ul className="flex flex-col gap-1 text-ui-sm">
          {demoAnalyses.map((analysis) => (
            <li key={analysis.id} className="flex gap-3">
              <span className="text-foreground">{analysis.startup.name}</span>
              <span className="text-mist">{analysis.status}</span>
              <span className="tabular-nums text-mist">{analysis.latest?.overallScore ?? "—"}</span>
            </li>
          ))}
        </ul>
        <div className="flex gap-8">
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
      </section>

      <ClaimInlineDemo />

      <section className="flex flex-col gap-2">
        <h2 className="text-h4 font-semibold">EvidenceMarker</h2>
        <div className="flex gap-4">
          {ALL_STATUSES.map((status) => (
            <div key={status} className="flex items-center gap-2">
              <EvidenceMarker status={status} />
              <span className="text-ui-sm text-mist">{status}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-h4 font-semibold">StatusBadge</h2>
        <div className="flex flex-col gap-2">
          <div className="flex gap-4">
            {ALL_STATUSES.map((status) => (
              <StatusBadge key={status} status={status} />
            ))}
          </div>
          <div className="flex gap-4">
            {ALL_STATUSES.map((status) => (
              <StatusBadge key={status} status={status} size="lg" />
            ))}
          </div>
          <StatusBadge status="VERIFIED" label="Sourced" />
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-h4 font-semibold">EvidenceBar</h2>
        <div className="flex flex-col gap-3">
          <div className="w-64">
            <EvidenceBar counts={{ VERIFIED: 5, AI_ANALYSIS: 2, ASSUMPTION: 2, MISSING: 1 }} />
          </div>
          <div className="w-64">
            <EvidenceBar counts={{ VERIFIED: 1, MISSING: 9 }} />
          </div>
          <div className="w-64">
            <EvidenceBar counts={{}} />
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-h4 font-semibold">ScoreGauge</h2>
        <div className="flex gap-8">
          <ScoreGauge score={71} confidence={0.6} />
          <ScoreGauge score={92} confidence={0.9} />
          <ScoreGauge score={60} confidence={0.4} cappedReason="open critical flag" />
          <ScoreGauge notScoredReason="Coverage below 0.5" />
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-h4 font-semibold">DimensionRadar</h2>
        <DimensionRadar
          scores={{
            founder: { score: 80, confidence: 0.8 },
            market: { score: 60, confidence: 0.5 },
            product: { score: 40, confidence: 0.2 },
            traction: { score: null, confidence: 0 },
            competitive: { score: 70, confidence: 0.7 },
            business_model: { score: 55, confidence: 0.45 },
            financial: { score: 30, confidence: 0.6 },
            risk: { score: 65, confidence: 0.9 },
          }}
        />
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-h4 font-semibold">Sparkline</h2>
        <div className="flex gap-8">
          <Sparkline values={[52, 58, 55, 63, 71]} label="Average score, last 5 runs" />
          <Sparkline values={[80, 74, 70, 65]} label="Average score, last 4 runs" />
          <Sparkline values={[40, 40, 40]} label="Average score, last 3 runs" />
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-h4 font-semibold">BarChart</h2>
        <div className="w-64">
          <BarChart
            data={[
              { label: "Fintech", value: 12 },
              { label: "Healthtech", value: 7 },
              { label: "Climate", value: 3 },
              { label: "Devtools", value: 1 },
            ]}
          />
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-h4 font-semibold">EmptyState</h2>
        <EmptyState message="Nothing watchlisted yet." />
        <EmptyState
          message="You haven't started an analysis yet."
          action={{ label: "New analysis", href: "/app/analyses/new" }}
        />
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-h4 font-semibold">InlineError</h2>
        <InlineError message="The sector-mix panel couldn't load." onRetry={() => {}} />
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-h4 font-semibold">Loading skeletons</h2>
        <p className="text-ui-sm text-mist">
          Nothing in Phase 1 fetches asynchronously yet (that&apos;s Phase 3), so these have no live
          trigger — sized to the real KpiStrip/AnalysesTable layout for when Phase 3 adds one.
        </p>
        <KpiStripSkeleton className="max-w-2xl" />
        <div className="max-w-2xl">
          <TableSkeleton columns={6} rows={3} />
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-h4 font-semibold">Breadcrumbs</h2>
        <Breadcrumbs
          items={[
            { label: "Analyses", href: "/app/analyses" },
            { label: "Loopwell", href: "/app/analyses/ana_1" },
            { label: "Financial" },
          ]}
        />
        <p className="text-ui-sm text-mist">
          AppShell (Sidebar, Topbar, MobileBottomBar) is previewed at <code>/app</code> instead of
          here — the mobile bar is viewport-fixed, so a contained gallery preview would misrepresent
          it.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-h4 font-semibold">ReliabilityChip</h2>
        <div className="flex gap-2">
          {ALL_RELIABILITIES.map((reliability) => (
            <ReliabilityChip key={reliability} reliability={reliability} />
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-h4 font-semibold">Dialog</h2>
        <Dialog>
          <DialogTrigger asChild>
            <Button>Open dialog</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm export</DialogTitle>
              <DialogDescription>This exports the current report as Markdown.</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
              </DialogClose>
              <Button>Export</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-h4 font-semibold">Sheet</h2>
        <Sheet>
          <SheetTrigger asChild>
            <Button>Open sheet</Button>
          </SheetTrigger>
          <SheetContent side="right">
            <SheetHeader>
              <SheetTitle>Evidence</SheetTitle>
            </SheetHeader>
            <p>Deck, page 7. &ldquo;ARR reached $2.0M in Q2&rdquo;</p>
          </SheetContent>
        </Sheet>
      </section>
    </main>
  );
}

/** ClaimInline + EvidenceRailContent, wired to real Loopwell data (D-031). */
function ClaimInlineDemo() {
  const allClaims = [
    ...demoReport.narrative.executiveSummary,
    ...demoReport.narrative.investmentOverview,
  ];
  const [selected, setSelected] = useState(allClaims[0] ?? null);

  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-h4 font-semibold">ClaimInline + EvidenceRail</h2>
      <div className="flex gap-8">
        <div className="flex max-w-md flex-col gap-2">
          {allClaims.map((claim) => (
            <ClaimInline
              key={claim.id}
              claim={claim}
              selected={selected?.id === claim.id}
              onSelect={setSelected}
            />
          ))}
        </div>
        {selected && (
          <div className="w-80 shrink-0 border-l border-hairline pl-6">
            <EvidenceRailContent
              claim={selected}
              evidence={demoEvidence}
              sources={demoSources}
              facts={demoFacts}
            />
          </div>
        )}
      </div>
    </section>
  );
}
