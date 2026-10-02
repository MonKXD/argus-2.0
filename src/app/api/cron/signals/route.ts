import { NextResponse } from "next/server";

import { createLlm } from "@/lib/ai/create-llm";
import { createAnthropicResearchProvider } from "@/lib/analysis/research/anthropic-research-provider";
import { detectSignalsForAnalysis } from "@/lib/analysis/steps/detect-signals";
import { ApiError, handleApiError } from "@/lib/api/errors";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { getAdminFirestore } from "@/lib/repos/admin-firestore";
import { AnalysisRepo } from "@/lib/repos/analysis-repo";

/**
 * T-6.01/FR-WCH-02: Vercel Cron hits this once a day (`vercel.json`),
 * sending `Authorization: Bearer $CRON_SECRET` by Vercel's own documented
 * convention — not a user-facing route, so no `requireUser()`/session
 * cookie, just that shared secret. Gated behind `env.FEATURE_MONITORING`
 * (already declared, unused, since before this task) so real web-search
 * and LLM cost is opt-in, not automatic the moment `CRON_SECRET` exists.
 *
 * Same Hobby-plan duration concern D-070 already flagged for run-creation
 * routes applies here too, now fanning out over every watchlisted company
 * instead of one analysis's own sources — processed sequentially with a
 * small per-company article cap (`detect-signals.ts`) and a per-company
 * try/catch, rather than unbounded concurrency, to stay inside this
 * route's own `maxDuration`. A queue-based fan-out is T-6.03's job if this
 * turns out not to be enough, the same escape hatch D-009/D-070 already
 * name for long-running work.
 */
export const maxDuration = 60;

function assertAuthorized(request: Request): void {
  const header = request.headers.get("authorization");
  if (!env.CRON_SECRET || header !== `Bearer ${env.CRON_SECRET}`) {
    throw new ApiError("UNAUTHENTICATED", "Not authorized.");
  }
}

export async function GET(request: Request): Promise<NextResponse> {
  try {
    assertAuthorized(request);

    if (!env.FEATURE_MONITORING) {
      return NextResponse.json({ processed: 0, succeeded: 0, failed: 0, skipped: "FEATURE_MONITORING is off" });
    }

    const db = getAdminFirestore();
    const analyses = await new AnalysisRepo(db).listWatchlisted();
    const llm = createLlm();
    const research = createAnthropicResearchProvider();

    let succeeded = 0;
    let failed = 0;

    for (const analysis of analyses) {
      try {
        await detectSignalsForAnalysis({ db, llm, research, analysis });
        succeeded += 1;
      } catch (error) {
        failed += 1;
        // IDs and a reason only — never company names or article content
        // (R-SEC-04).
        logger.error(
          { analysisId: analysis.id, reason: error instanceof Error ? error.message : "unknown" },
          "cron/signals: failed for one watchlisted analysis",
        );
      }
    }

    return NextResponse.json({ processed: analyses.length, succeeded, failed });
  } catch (error) {
    return handleApiError(error);
  }
}
