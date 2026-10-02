
import { LegalPage } from "@/components/marketing/legal-page";
import { DISCLAIMER_TEXT } from "@/lib/disclaimer";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Terms of Service — ARGUS AI" };

/**
 * T-6.09 (PRD section 15, FR-LND-03). A draft for a pre-launch product —
 * real legal review is still recommended before public launch (OQ-8, stays
 * open in docs/TRACKER.md). Governing law is left as a bracketed
 * placeholder since no jurisdiction has been decided; everything else
 * reflects the product's actual, already-built behaviour (self-service
 * export/delete, the real disclaimer text, the real third-party processing
 * named in the privacy policy) rather than generic boilerplate.
 */
export default function TermsPage() {
  return (
    <LegalPage title="Terms of service" updated="October 2026">
      <p>
        These terms govern your use of ARGUS AI. By creating an account or using the product, you
        agree to them.
      </p>

      <h2>The service</h2>
      <p>
        ARGUS AI extracts evidence from documents, links and notes you provide, analyses it, and
        produces a report with claims, flags and an Investment Score. {DISCLAIMER_TEXT}
      </p>

      <h2>Your account</h2>
      <p>
        You must provide an accurate email address to create an account, and you are responsible for
        activity under your account. You may delete your account at any time from Settings, which
        permanently removes your data as described in our{" "}
        <a href="/legal/privacy" className="underline">
          Privacy Policy
        </a>
        .
      </p>

      <h2>Your content</h2>
      <p>
        You retain all rights to the documents, notes and other material you submit (&ldquo;your
        content&rdquo;). You grant us a licence to process your content solely to provide the
        service to you — to extract evidence from it, analyse it, and generate your reports. You
        are responsible for having the rights to submit any content you upload, and for not
        submitting content that is illegal, infringes someone else&rsquo;s rights, or that you are
        not authorised to share (for example, another party&rsquo;s confidential information shared
        without their consent).
      </p>

      <h2>Acceptable use</h2>
      <p>You agree not to:</p>
      <ul>
        <li>use the service to build a competing product by systematically extracting its outputs;</li>
        <li>attempt to bypass usage limits, security controls, or access another user&rsquo;s data;</li>
        <li>submit content designed to manipulate or attack the underlying AI models; or</li>
        <li>use the service for any unlawful purpose.</li>
      </ul>

      <h2>No professional advice</h2>
      <p>{DISCLAIMER_TEXT}</p>

      <h2>Disclaimer of warranties</h2>
      <p>
        The service is provided &ldquo;as is&rdquo;, without warranties of any kind, express or implied,
        including accuracy, completeness or fitness for a particular purpose. AI-generated analysis
        can contain errors.
      </p>

      <h2>Limitation of liability</h2>
      <p>
        To the fullest extent permitted by law, ARGUS AI and its operator are not liable for any
        indirect, incidental or consequential damages, or for any decision made in reliance on a
        report, arising from your use of the service.
      </p>

      <h2>Termination</h2>
      <p>
        You may stop using the service and delete your account at any time. We may suspend or
        terminate an account that violates these terms.
      </p>

      <h2>Changes to these terms</h2>
      <p>
        We may update these terms from time to time. Continuing to use the service after an update
        means you accept the revised terms.
      </p>

      <h2>Governing law</h2>
      <p>[Governing law and jurisdiction to be confirmed.]</p>
    </LegalPage>
  );
}
