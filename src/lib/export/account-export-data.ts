
import type { ActivityRepo } from "@/lib/repos/activity-repo";
import type { AnalysisRepo } from "@/lib/repos/analysis-repo";
import type { ComparisonRepo } from "@/lib/repos/comparison-repo";
import { zodConverter } from "@/lib/repos/converter";
import type { FeedbackRepo } from "@/lib/repos/feedback-repo";
import type { ReportRepo } from "@/lib/repos/report-repo";
import type { SourceRepo } from "@/lib/repos/source-repo";
import type { Activity } from "@/lib/schema/activity";
import type { Analysis } from "@/lib/schema/analysis";
import type { Comparison } from "@/lib/schema/comparison";
import type { Source } from "@/lib/schema/evidence";
import type { Feedback } from "@/lib/schema/feedback";
import type { Report } from "@/lib/schema/report";
import { Run } from "@/lib/schema/run";

import type { Firestore } from "firebase-admin/firestore";

export interface AccountExportAnalysis {
  analysis: Analysis;
  sources: Source[];
  runs: Run[];
  reports: Report[];
}

export interface AccountExportPayload {
  exportedAt: string;
  ownerId: string;
  analyses: AccountExportAnalysis[];
  comparisons: Comparison[];
  activity: Activity[];
  feedback: Feedback[];
}

/**
 * T-6.12 (FR-SET-03, "export all my data"). Scope call, reasoned not asked
 * (a contained implementation-shape decision, same class as D-086's own
 * export-scope reasoning): includes every owned top-level record and, per
 * analysis, its sources (what was submitted), every run (what happened) and
 * every report version (the actual deliverable — already contains every
 * claim and quote extracted from the evidence). Deliberately excludes raw
 * Evidence/Fact records: those are internal processing artifacts, not
 * further distillation of "the user's data" beyond what the reports
 * already carry, and R-DAT-03's "never load all evidence for list views"
 * caution extends naturally to not making a single synchronous export
 * route's response size depend on an owner's entire evidence corpus across
 * every analysis they've ever run. `feedback` is included since it's the
 * owner's own authored text, unlike Evidence/Facts.
 */
export async function buildAccountExportPayload(
  db: Firestore,
  ownerId: string,
  repos: {
    analysisRepo: AnalysisRepo;
    sourceRepo: SourceRepo;
    reportRepo: ReportRepo;
    comparisonRepo: ComparisonRepo;
    activityRepo: ActivityRepo;
    feedbackRepo: FeedbackRepo;
  },
): Promise<AccountExportPayload> {
  const analyses = await repos.analysisRepo.listByOwner(ownerId);

  const analysisExports = await Promise.all(
    analyses.map(async (analysis): Promise<AccountExportAnalysis> => {
      const [sources, runsSnapshot, reports] = await Promise.all([
        repos.sourceRepo.list(analysis.id),
        db
          .collection("analyses")
          .doc(analysis.id)
          .collection("runs")
          .withConverter(zodConverter(Run))
          .get(),
        repos.reportRepo.list(analysis.id),
      ]);
      return {
        analysis,
        sources,
        runs: runsSnapshot.docs.map((doc) => doc.data()),
        reports,
      };
    }),
  );

  const [comparisons, activity, feedback] = await Promise.all([
    repos.comparisonRepo.listByOwner(ownerId),
    repos.activityRepo.listByOwner(ownerId, 10_000),
    repos.feedbackRepo.listByOwner(ownerId),
  ]);

  return {
    exportedAt: new Date().toISOString(),
    ownerId,
    analyses: analysisExports,
    comparisons,
    activity,
    feedback,
  };
}
