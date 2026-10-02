import { recordActivity } from "@/lib/activity";
import type { LLM } from "@/lib/ai/llm";
import { ingestSource } from "@/lib/analysis/ingest/ingest-source";
import {
  buildSignalDetectionPrompt,
  SIGNAL_DETECTION_TOOL_NAME,
  SubmitSignalSummaryInput,
} from "@/lib/analysis/prompts/signal-detection";
import type { ResearchProvider } from "@/lib/analysis/research/research-provider";
import { logger } from "@/lib/logger";
import { SignalRepo } from "@/lib/repos/signal-repo";
import { SourceRepo } from "@/lib/repos/source-repo";
import type { Analysis } from "@/lib/schema/analysis";
import { newId } from "@/lib/schema/ids";
import type { Signal } from "@/lib/schema/signal";

import type { Firestore } from "firebase-admin/firestore";

const MAX_OUTPUT_TOKENS = 1024;
/** Articles checked per company per run — bounded so one company's scan
 * can't exhaust a shared `maxDuration` budget (D-070's own concern,
 * applied here to a job that now fans out over every watchlisted company,
 * not just one analysis's own sources). */
const MAX_NEW_ARTICLES_PER_RUN = 3;
const SEARCH_RESULTS_TO_CONSIDER = 5;

export interface DetectSignalsArgs {
  db: Firestore;
  llm: LLM;
  research: ResearchProvider;
  analysis: Analysis;
  signal?: AbortSignal;
}

export interface DetectSignalsResult {
  signalsCreated: number;
}

/**
 * FR-WCH-02: "Scheduled signal refresh for watchlisted companies via web
 * research (news and public changes), stored with sources." One real web
 * search per company, then the existing INGEST machinery (`ingestSource`,
 * already SSRF-safe and already tested) turns each new article URL into a
 * real `Source`+`Evidence` pair — "stored with sources" isn't a separate
 * requirement to invent a mechanism for, it's exactly what INGEST already
 * does. A single FAST-role call per article then grounds a `Signal` in
 * that evidence; the model never supplies title/url/publisher itself
 * (R-AI-01), only a summary and classification of text it was actually
 * given. Dedupes against this analysis's own already-surfaced signal URLs
 * so a daily re-run doesn't recreate the same signal.
 */
export async function detectSignalsForAnalysis(args: DetectSignalsArgs): Promise<DetectSignalsResult> {
  const { db, llm, research, analysis } = args;
  const signalRepo = new SignalRepo(db);
  const sourceRepo = new SourceRepo(db);

  const existing = await signalRepo.listByAnalysis(analysis.id);
  const seenUrls = new Set(existing.map((s) => s.url));

  const hits = await research.search(`"${analysis.startup.name}" news`, {
    maxResults: SEARCH_RESULTS_TO_CONSIDER,
  });
  const newHits = hits.filter((hit) => !seenUrls.has(hit.url)).slice(0, MAX_NEW_ARTICLES_PER_RUN);

  let signalsCreated = 0;

  for (const hit of newHits) {
    try {
      const companyDomain = analysis.startup.website
        ? safeHostname(analysis.startup.website)
        : undefined;

      const { source, evidence } = await ingestSource(analysis.id, {
        id: newId("src"),
        type: "WEB_RESEARCH",
        origin: "RESEARCH",
        title: hit.title,
        url: hit.url,
        companyDomain,
      });

      if (evidence.length === 0) continue; // nothing extracted from this page
      await sourceRepo.create(source, evidence);

      const articleText = evidence.map((e) => e.text).join("\n\n");
      const prompt = buildSignalDetectionPrompt(analysis.startup.name, articleText);
      const { data } = await llm.structured<SubmitSignalSummaryInput>({
        role: "FAST",
        system: prompt.system,
        user: prompt.user,
        cachePrefix: prompt.cachePrefix,
        toolName: SIGNAL_DETECTION_TOOL_NAME,
        schema: SubmitSignalSummaryInput,
        maxOutputTokens: MAX_OUTPUT_TOKENS,
        signal: args.signal,
      });

      const now = new Date().toISOString();
      const signalRecord: Signal = {
        id: newId("sig"),
        analysisId: analysis.id,
        title: hit.title,
        url: hit.url,
        publisher: safeHostname(hit.url),
        publishedAt: undefined,
        summary: data.summary,
        impact: data.impact,
        relatedDimension: data.relatedDimension,
        evidenceId: evidence[0]!.id,
        retrievedAt: now,
      };
      await signalRepo.create(signalRecord);
      signalsCreated += 1;

      await recordActivity(db, {
        ownerId: analysis.ownerId,
        type: "SIGNAL_DETECTED",
        analysisId: analysis.id,
        // Activity.message caps at 200 chars (SCHEMA.md) — truncate the
        // whole composed sentence, not just the title, so it never exceeds
        // that regardless of how long the company name or title are.
        message: truncate(`New signal for ${analysis.startup.name}: ${hit.title}`, 200),
      });
    } catch (error) {
      // One bad article (unreachable, SSRF-blocked, LLM failure) shouldn't
      // stop the rest of this company's candidates or the next company in
      // the cron job's own loop — R-COD-11: logged, not silently dropped.
      logger.warn(
        { analysisId: analysis.id, reason: error instanceof Error ? error.message : "unknown" },
        "detectSignalsForAnalysis: skipped one candidate article",
      );
    }
  }

  return { signalsCreated };
}

function safeHostname(url: string): string | undefined {
  try {
    return new URL(url).hostname;
  } catch {
    return undefined;
  }
}

function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}
