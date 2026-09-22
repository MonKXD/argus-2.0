import { ClaimKinds } from "@/components/marketing/claim-kinds";
import { CompareTeaser } from "@/components/marketing/compare-teaser";
import { FinalCta } from "@/components/marketing/final-cta";
import { Hero } from "@/components/marketing/hero";
import { HowItWorks } from "@/components/marketing/how-it-works";
import { ReportTour } from "@/components/marketing/report-tour";
import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteHeader } from "@/components/marketing/site-header";
import { TrustSection } from "@/components/marketing/trust-section";

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
