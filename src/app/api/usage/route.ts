import { NextResponse } from "next/server";

import { getRunUsage } from "@/lib/analysis/run-limits";
import { requireUser } from "@/lib/api/auth";
import { handleApiError } from "@/lib/api/errors";
import { env } from "@/lib/env";
import { getAdminFirestore } from "@/lib/repos/admin-firestore";

/**
 * FR-SET-01: "Usage and limits view." Read-only — returns the same real
 * counts `assertWithinRunLimits` (T-3.08) checks against, via the shared
 * `getRunUsage()`, so the view can never show a number that disagrees with
 * what actually gates starting a run. Limit values come straight from
 * `env`, already the single source of truth `run-limits.ts` itself reads.
 */
export async function GET(): Promise<NextResponse> {
  try {
    const user = await requireUser();
    const usage = await getRunUsage(getAdminFirestore(), user.uid);

    return NextResponse.json({
      runningCount: usage.runningCount,
      dailyCount: usage.dailyCount,
      maxConcurrentRuns: env.MAX_CONCURRENT_RUNS,
      dailyAnalysisLimit: env.DAILY_ANALYSIS_LIMIT,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
