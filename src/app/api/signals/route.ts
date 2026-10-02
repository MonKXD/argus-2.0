import { NextResponse } from "next/server";

import { requireUser } from "@/lib/api/auth";
import { handleApiError } from "@/lib/api/errors";
import { getAdminFirestore } from "@/lib/repos/admin-firestore";
import { AnalysisRepo } from "@/lib/repos/analysis-repo";
import { SignalRepo } from "@/lib/repos/signal-repo";

const MAX_SIGNALS = 20;

/**
 * T-6.02 (FR-WCH-03): every signal across the signed-in owner's watchlisted
 * analyses, newest first, capped at 20 — a feed, not a full archive. Scoped
 * to the owner by first listing their own analyses (R-SEC-01; this never
 * touches T-6.01's cross-owner `listWatchlisted()`), then reading each
 * watchlisted one's own `signals` subcollection. One owner's watchlist is
 * already a small, bounded set (D-059's own reasoning), so an N+1 read here
 * is the same accepted trade-off as every other per-analysis aggregation in
 * this app (D-074, D-090).
 */
export async function GET(): Promise<NextResponse> {
  try {
    const user = await requireUser();
    const db = getAdminFirestore();
    const analysisRepo = new AnalysisRepo(db);
    const signalRepo = new SignalRepo(db);

    const analyses = (await analysisRepo.listByOwner(user.uid)).filter((a) => a.isWatchlisted);
    const perAnalysis = await Promise.all(
      analyses.map(async (analysis) => {
        const signals = await signalRepo.listByAnalysis(analysis.id);
        return signals.map((signal) => ({ ...signal, companyName: analysis.startup.name }));
      }),
    );

    const signals = perAnalysis
      .flat()
      .sort((a, b) => b.retrievedAt.localeCompare(a.retrievedAt))
      .slice(0, MAX_SIGNALS);

    return NextResponse.json({ signals });
  } catch (error) {
    return handleApiError(error);
  }
}
