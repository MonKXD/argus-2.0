import dynamic from "next/dynamic";

import { ClaimKinds } from "@/components/marketing/claim-kinds";
import { CompareTeaser } from "@/components/marketing/compare-teaser";
import { FinalCta } from "@/components/marketing/final-cta";
import { Hero } from "@/components/marketing/hero";
import { HowItWorks } from "@/components/marketing/how-it-works";
import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteHeader } from "@/components/marketing/site-header";
import { TrustSection } from "@/components/marketing/trust-section";
import { Skeleton } from "@/components/ui/skeleton";

// T-6.06 (performance pass, NFR-01): ReportTour is the only "use client"
// section on the landing page (its Tabs need interactivity) and pulls in
// the full demo dataset plus a chart component — code-split it into its own
// chunk, below the fold, so that weight isn't in the initial hydration path
// for Hero's above-the-fold content. Sized placeholder avoids CLS.
const ReportTour = dynamic(() => import("@/components/marketing/report-tour").then((m) => m.ReportTour), {
  loading: () => <Skeleton className="mx-auto h-[640px] max-w-[1360px]" />,
});

// DESIGN section 5.6: section order is hero; four kinds of statement; how it
// works; report tour; compare; trust; final CTA; footer with disclaimer
// (FR-LND-01, FR-LND-03).
export default function Home() {
  return (
    <>
      <SiteHeader />
      <main>
        <Hero />
        <ClaimKinds />
        <HowItWorks />
        <ReportTour />
        <CompareTeaser />
        <TrustSection />
        <FinalCta />
      </main>
      <SiteFooter />
    </>
  );
}
