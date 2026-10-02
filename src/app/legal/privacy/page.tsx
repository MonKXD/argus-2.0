import { LegalPage } from "@/components/marketing/legal-page";

import type { Metadata } from "next";


export const metadata: Metadata = { title: "Privacy Policy — ARGUS AI" };

/**
 * T-6.09 (PRD section 15, FR-LND-03). Drafted to accurately describe what
 * this codebase actually does (R-AI-01's "never invent" spirit extended to
 * our own legal copy, not just model output) — every processor named here
 * is a real dependency already wired up (Firebase, the configured
 * LLM_PROVIDER, web research when FEATURE_WEB_RESEARCH is on, Sentry when a
 * DSN is configured, QStash only in queue orchestration mode) — not a
 * standard template's generic list. This is a draft for a pre-launch
 * product; real legal review is still recommended before public launch
 * (PRD section 15 / OQ-8, tracked in docs/TRACKER.md — stays open).
 */
export default function PrivacyPolicyPage() {
  return (
    <LegalPage title="Privacy policy" updated="October 2026">
      <p>
        This policy describes what ARGUS AI collects, how it is used, and who else processes it. It
        applies to the ARGUS AI web application and the documents, links and notes you submit to it.
      </p>

      <h2>What we collect</h2>
      <ul>
        <li>Your email address, used to sign you in (via Firebase Authentication).</li>
        <li>
          The documents, pasted text and URLs you submit for analysis, and the facts and claims
          extracted from them.
        </li>
        <li>
          Your analyses, reports, comparisons, watchlist and activity history within the product.
        </li>
        <li>
          Operational logs: request IDs, timestamps, step names and durations, and token/cost
          counts. We do not log the content of your documents, the text of your claims, or model
          prompts or responses — only identifiers, counts and timings.
        </li>
      </ul>

      <h2>How we use it</h2>
      <p>
        We use what you submit to run the analysis pipeline and produce your report, to enforce
        per-account usage limits, and to maintain and secure the service. We do not sell your data,
        and we do not use your documents to train any model.
      </p>

      <h2>Who else processes your data</h2>
      <p>Submitted content and account data pass through the following third-party processors:</p>
      <ul>
        <li>
          <strong>Google Firebase</strong> (Authentication, Firestore, Cloud Storage) hosts your
          account, your submitted files, and your analysis data.
        </li>
        <li>
          <strong>An AI model provider</strong> (Google Gemini by default, or Anthropic if the
          operator has configured it) receives the text extracted from your documents and notes to
          produce the extracted facts, claims and narrative in your report.
        </li>
        <li>
          When web research is enabled for an analysis, the same model provider&rsquo;s web search
          capability may be used to find independent, publicly available information about the
          company, and the pages it finds are fetched and processed the same way as your own
          sources.
        </li>
        <li>
          <strong>Sentry</strong>, when the operator has configured it, receives error reports
          (error messages, stack traces and request metadata) to help us find and fix bugs. It never
          receives document content.
        </li>
        <li>
          <strong>Upstash</strong>, when the operator has enabled queue-based run orchestration,
          relays run-continuation messages (analysis and run IDs only, never document content)
          between steps of a long-running analysis.
        </li>
      </ul>

      <h2>How long we keep it</h2>
      <p>
        We keep your data for as long as your account exists. Deleting an analysis permanently
        removes its sources, evidence, facts, reports and runs. Deleting your account permanently
        removes every analysis, comparison and activity record associated with it, and your sign-in
        credentials — this cannot be undone.
      </p>

      <h2>Your choices</h2>
      <ul>
        <li>Export a copy of your data at any time, from Settings.</li>
        <li>Delete any analysis, or your entire account, at any time — both take effect immediately.</li>
      </ul>

      <h2>Security</h2>
      <p>
        Every read and write is scoped to your own account on the server; the database and storage
        rules deny access by default. Links you submit are fetched through a guard that blocks
        requests to private and internal network addresses. Secrets are never logged, and document
        content is never written to our operational logs.
      </p>

      <h2>Children</h2>
      <p>ARGUS AI is a business tool and is not directed at, or intended for use by, children.</p>

      <h2>Changes to this policy</h2>
      <p>
        If this policy changes in a way that materially affects how your data is handled, we will
        update this page and change the date above.
      </p>
    </LegalPage>
  );
}
