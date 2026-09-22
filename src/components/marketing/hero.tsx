import Link from "next/link";

import { ClaimInline } from "@/components/argus/claim-inline";
import { locatorLabel } from "@/components/argus/evidence-rail";
import { Button } from "@/components/ui/button";
import { demoEvidence, demoReport, demoSources } from "@/demo";
import type { Claim } from "@/lib/schema/claims";

import type { CSSProperties } from "react";

/**
 * DESIGN section 5.6 + section 8 ("the one orchestrated moment"): headline,
 * sub copy, two CTAs, and a sample card built from the real ClaimInline
 * component against the real (fictional) demo dataset — not a screenshot.
 * Four example claims, one per status, animate in via the .hero-claim /
 * .hero-evidence CSS in globals.css; prefers-reduced-motion shows the
 * final state immediately (no JS needed either way).
 */

const HERO_CLAIMS: Claim[] = [
  demoReport.narrative.executiveSummary[0],
  demoReport.narrative.aiInsights[0],
  demoReport.narrative.investmentOverview[0],
  demoReport.narrative.investmentOverview[1],
].filter((claim): claim is Claim => claim !== undefined);

function heroEvidenceCaption(): string | null {
  const verified = HERO_CLAIMS.find((c) => c.status === "VERIFIED");
  if (!verified || verified.status !== "VERIFIED") return null;
  const quote = verified.quotes[0];
  if (!quote) return null;
  const evidence = demoEvidence.find((e) => e.id === quote.evidenceId);
  const source = evidence ? demoSources.find((s) => s.id === evidence.sourceId) : undefined;
  if (!source) return null;
  const locator = evidence ? locatorLabel(evidence.locator) : null;
  return `${source.title}${locator ? `, ${locator}` : ""}`;
}

function Hero() {
  const evidenceCaption = heroEvidenceCaption();

  return (
    <section className="mx-auto grid max-w-[1360px] grid-cols-1 gap-10 px-4 py-12 lg:grid-cols-12 lg:gap-12 lg:px-8 lg:py-20">
      <div className="lg:col-span-5">
        <h1 className="font-serif text-display text-foreground">
          Every claim, traced to its source.
        </h1>
        <p className="mt-5 max-w-prose text-prose text-mist">
          ARGUS reads a pitch deck, a website and your notes, then marks what it verified, what it
          inferred, what it assumed, and what is still missing.
        </p>
        <div className="mt-7 flex flex-wrap gap-3">
          <Button asChild size="lg">
            <Link href="/app/analyses/new">Start an analysis</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/sample">See a sample report</Link>
          </Button>
        </div>
      </div>

      <div className="lg:col-span-7">
        <div className="rounded-panel border border-hairline-strong bg-panel p-6">
          <p className="mb-4 text-ui-sm text-mist">Sample, fictional company</p>
          <ul className="flex flex-col gap-3">
            {HERO_CLAIMS.map((claim, i) => (
              <li
                key={claim.id}
                className="hero-claim"
                style={{ "--hero-delay": `${i * 300}ms` } as CSSProperties}
              >
                <ClaimInline claim={claim} />
              </li>
            ))}
          </ul>
          {evidenceCaption && (
            <p
              className="hero-evidence mt-4 border-t border-hairline pt-3 text-ui-sm text-mist"
              style={{ "--hero-delay": `${HERO_CLAIMS.length * 300}ms` } as CSSProperties}
            >
              Evidence: {evidenceCaption}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

export { Hero };
