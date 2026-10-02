import { NextResponse } from "next/server";

import { requireUser } from "@/lib/api/auth";
import { handleApiError } from "@/lib/api/errors";
import { buildAccountExportPayload } from "@/lib/export/account-export-data";
import { ActivityRepo } from "@/lib/repos/activity-repo";
import { getAdminFirestore } from "@/lib/repos/admin-firestore";
import { AnalysisRepo } from "@/lib/repos/analysis-repo";
import { ComparisonRepo } from "@/lib/repos/comparison-repo";
import { FeedbackRepo } from "@/lib/repos/feedback-repo";
import { ReportRepo } from "@/lib/repos/report-repo";
import { SourceRepo } from "@/lib/repos/source-repo";

// T-6.12 (FR-SET-03, "export all my data"). Read-only (a GET, not a
// mutation), so this skips assertSameOrigin by the same reasoning as
// T-5.05's report export (R-SEC-07 scopes the origin check to mutating
// routes) — a plain <a href> download, no client-side fetch/blob JS needed.
// A full account export can touch many documents across every owned
// analysis, so this gets the same generous maxDuration as the heaviest
// export route (T-6.04's PDF export) rather than the plain-text default.
export const maxDuration = 45;

export async function GET(): Promise<NextResponse> {
  try {
    const user = await requireUser();
    const db = getAdminFirestore();

    const payload = await buildAccountExportPayload(db, user.uid, {
      analysisRepo: new AnalysisRepo(db),
      sourceRepo: new SourceRepo(db),
      reportRepo: new ReportRepo(db),
      comparisonRepo: new ComparisonRepo(db),
      activityRepo: new ActivityRepo(db),
      feedbackRepo: new FeedbackRepo(db),
    });

    return new NextResponse(JSON.stringify(payload, null, 2), {
      headers: {
        "content-type": "application/json",
        "content-disposition": `attachment; filename="argus-data-export.json"`,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
