import { createHash } from "node:crypto";

import { chunkText } from "@/lib/analysis/ingest/chunk-text";
import type { ExtractedPage } from "@/lib/analysis/ingest/extractor";
import { detectInjectionPattern } from "@/lib/analysis/ingest/injection-detection";
import { sanitizeText } from "@/lib/analysis/ingest/sanitize";
import type { Reliability, SourceType } from "@/lib/schema/enums";
import type { Evidence } from "@/lib/schema/evidence";
import { newId } from "@/lib/schema/ids";

export interface BuildEvidenceContext {
  analysisId: string;
  sourceId: string;
  sourceType: SourceType;
  retrievedAt: string;
  /** The evidence page's own URL, when the source is a web page (WEBSITE or WEB_RESEARCH). */
  evidenceUrl?: string;
  /** The startup's own website domain, for the WEB_RESEARCH own-domain exception below. */
  companyDomain?: string;
}

export interface InjectionMatch {
  evidenceId: string;
  pattern: string;
}

export interface BuildEvidenceResult {
  evidence: Evidence[];
  injectionMatches: InjectionMatch[];
}

/**
 * AI_SPEC section 3.1: "Reliability by source: pitch deck, financial
 * document, company document, notes → PROVIDED; company website →
 * FIRST_PARTY; research pages → INDEPENDENT, except pages on the
 * company's own domain → FIRST_PARTY."
 */
export function reliabilityForSource(
  sourceType: SourceType,
  evidenceUrl: string | undefined,
  companyDomain: string | undefined,
): Reliability {
  if (sourceType === "WEBSITE") return "FIRST_PARTY";
  if (sourceType === "WEB_RESEARCH") {
    if (evidenceUrl && companyDomain) {
      try {
        if (new URL(evidenceUrl).hostname.endsWith(companyDomain)) return "FIRST_PARTY";
      } catch {
        // fall through to INDEPENDENT on an unparseable URL
      }
    }
    return "INDEPENDENT";
  }
  return "PROVIDED"; // PITCH_DECK, FINANCIAL_DOC, COMPANY_DOC, USER_NOTES
}

/**
 * Turns the natural-boundary units an `Extractor`/`WebsiteExtractor`
 * produces into `Evidence` records: further chunking any unit still over
 * 2,000 characters (T-2.06), sanitising, hashing, assigning reliability,
 * and flagging (without removing) instruction-like text. Deliberately a
 * pure function — no `EvidenceStore` write here, no `Flag`/`RunWarning`
 * construction: a real `analysisId`/`runId`-scoped INGEST step (still
 * unbuilt) owns turning `injectionMatches` into an actual flag.
 */
export function buildEvidence(
  pages: ExtractedPage[],
  context: BuildEvidenceContext,
): BuildEvidenceResult {
  const reliability = reliabilityForSource(
    context.sourceType,
    context.evidenceUrl,
    context.companyDomain,
  );

  const evidence: Evidence[] = [];
  const injectionMatches: InjectionMatch[] = [];

  for (const page of pages) {
    for (const chunk of chunkText(page.text)) {
      const text = sanitizeText(chunk.text);
      if (!text) continue;

      const id = newId("ev");

      evidence.push({
        id,
        analysisId: context.analysisId,
        sourceId: context.sourceId,
        locator: { ...page.locator, startChar: chunk.startChar, endChar: chunk.endChar },
        text,
        reliability,
        extraction: page.needsVision ? "vision" : "text",
        retrievedAt: context.retrievedAt,
        contentHash: createHash("sha256").update(text, "utf-8").digest("hex"),
      });

      const pattern = detectInjectionPattern(text);
      if (pattern) injectionMatches.push({ evidenceId: id, pattern });
    }
  }

  return { evidence, injectionMatches };
}
