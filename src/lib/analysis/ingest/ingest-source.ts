import {
  buildEvidence,
  reliabilityForSource,
  type InjectionMatch,
} from "@/lib/analysis/ingest/build-evidence";
import { extractorForFilename } from "@/lib/analysis/ingest/extractor-for-file";
import { WebsiteExtractor } from "@/lib/analysis/ingest/website-extractor";
import type { SourceOrigin, SourceType } from "@/lib/schema/enums";
import type { Evidence, Source } from "@/lib/schema/evidence";

export interface IngestSourceInput {
  id: string;
  type: SourceType;
  origin: SourceOrigin;
  title: string;
  /** Exactly one of `file` or `url` — a local buffer to run through an `Extractor`, or a page to crawl with `WebsiteExtractor`. */
  file?: { filename: string; buffer: Buffer };
  url?: string;
  companyDomain?: string;
  /** Mirrors env.MAX_PDF_PAGES (T-3.06's real caller passes it through); omitted callers (CLI/eval fixtures) keep PdfExtractor's own default. */
  maxPdfPages?: number;
  /** Same test-only escape hatch as safeFetch/WebsiteExtractor — never set by production callers. The eval harness sets it for its local-server WEBSITE fixture (F7). */
  unsafeAllowPrivateNetworksForTests?: boolean;
}

export interface IngestSourceResult {
  source: Source;
  evidence: Evidence[];
  injectionMatches: InjectionMatch[];
}

/**
 * INGEST for one source (AI_SPEC 3.1): picks the right `Extractor` by file
 * extension or crawls the URL with `WebsiteExtractor`, then runs the
 * result through `buildEvidence()` (T-2.06). Assembles the `Source` record
 * itself too — the CLI/eval pipeline (T-2.16/T-2.17) is the first caller
 * that needs a real `Source`, not just `Evidence`.
 */
export async function ingestSource(
  analysisId: string,
  input: IngestSourceInput,
): Promise<IngestSourceResult> {
  const retrievedAt = new Date().toISOString();

  const pages = input.url
    ? await new WebsiteExtractor({
        unsafeAllowPrivateNetworksForTests: input.unsafeAllowPrivateNetworksForTests,
      }).extract(input.url)
    : input.file
      ? await extractorForFilename(input.file.filename, { maxPdfPages: input.maxPdfPages }).extract(
          input.file.buffer,
        )
      : missingContent(input.id);

  const reliability = reliabilityForSource(input.type, input.url, input.companyDomain);

  const source: Source = {
    id: input.id,
    analysisId,
    type: input.type,
    origin: input.origin,
    title: input.title,
    filename: input.file?.filename,
    url: input.url,
    status: "PARSED",
    reliability,
    addedAt: retrievedAt,
    parsedAt: retrievedAt,
  };

  const { evidence, injectionMatches } = buildEvidence(pages, {
    analysisId,
    sourceId: input.id,
    sourceType: input.type,
    retrievedAt,
    evidenceUrl: input.url,
    companyDomain: input.companyDomain,
  });

  return { source, evidence, injectionMatches };
}

function missingContent(sourceId: string): never {
  throw new Error(`ingestSource: source "${sourceId}" has neither a file nor a url`);
}
