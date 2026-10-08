
import { LegalPage } from "@/components/marketing/legal-page";
import { DISCLAIMER_TEXT } from "@/lib/disclaimer";

import type { Metadata } from "next";

// T-6.15: the root layout's title template ("%s — ARGUS AI") appends the
// suffix now, so this names only the page-specific part.
export const metadata: Metadata = { title: "Disclaimer" };

// T-6.09 (PRD section 15, FR-LND-03): the standalone destination for the
// footer's "Disclaimer" link. The verbatim required text is already shown
// on the landing footer, report footer and every export (DISCLAIMER_TEXT,
// T-5.05/D-086) — this page is the same text, not a reworded version.
export default function DisclaimerPage() {
  return (
    <LegalPage title="Disclaimer" updated="October 2026">
      <p>{DISCLAIMER_TEXT}</p>
      <h2>What this means in practice</h2>
      <p>
        ARGUS AI reads the documents, links and notes you provide and produces a structured report:
        an Investment Score, a confidence level, and a set of claims, each labelled Verified, AI
        analysis, Assumption or Missing. None of this is a recommendation to invest, not to invest,
        or to take any other action.
      </p>
      <p>
        The underlying language model can still make mistakes, even where a claim is labelled
        Verified. Verified means a claim is backed by at least one quote we could match back to a
        source you provided or an independent source our research found — it does not mean the
        underlying fact has been independently audited by a person. Always read the cited quotes and
        sources yourself, and verify anything material before relying on it.
      </p>
      <p>
        For the policies that govern your use of the product and how we handle your data, see our{" "}
        <a href="/legal/terms" className="underline">
          Terms of Service
        </a>{" "}
        and{" "}
        <a href="/legal/privacy" className="underline">
          Privacy Policy
        </a>
        .
      </p>
    </LegalPage>
  );
}
