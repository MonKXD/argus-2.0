import { describe, expect, it } from "vitest";

import { loopwellAnalysis, loopwellReport, loopwellSources } from "@/demo/loopwell";
import { fernwayHealthRun } from "@/demo/portfolio";
import { buildAccountExportPayload } from "@/lib/export/account-export-data";
import { ActivityRepo } from "@/lib/repos/activity-repo";
import { AnalysisRepo } from "@/lib/repos/analysis-repo";
import { ComparisonRepo } from "@/lib/repos/comparison-repo";
import { FeedbackRepo } from "@/lib/repos/feedback-repo";
import { NoteRepo } from "@/lib/repos/note-repo";
import { ReportRepo } from "@/lib/repos/report-repo";
import { SourceRepo } from "@/lib/repos/source-repo";

import { createFakeFirestore } from "../helpers/fake-firestore";

const OWNER_ID = loopwellAnalysis.ownerId;

function repos(db: ReturnType<typeof createFakeFirestore>["db"]) {
  return {
    analysisRepo: new AnalysisRepo(db),
    sourceRepo: new SourceRepo(db),
    reportRepo: new ReportRepo(db),
    noteRepo: new NoteRepo(db),
    comparisonRepo: new ComparisonRepo(db),
    activityRepo: new ActivityRepo(db),
    feedbackRepo: new FeedbackRepo(db),
  };
}

describe("buildAccountExportPayload (T-6.12)", () => {
  it("assembles every owned analysis with its sources, runs and reports, plus comparisons/activity/feedback", async () => {
    const { db, store } = createFakeFirestore();
    store.set(`analyses/${loopwellAnalysis.id}`, loopwellAnalysis);
    for (const source of loopwellSources) {
      store.set(`analyses/${loopwellAnalysis.id}/sources/${source.id}`, source);
    }
    store.set(`analyses/${loopwellAnalysis.id}/runs/${fernwayHealthRun.id}`, {
      ...fernwayHealthRun,
      analysisId: loopwellAnalysis.id,
      ownerId: OWNER_ID,
    });
    store.set(`analyses/${loopwellAnalysis.id}/reports/${loopwellReport.id}`, loopwellReport);
    store.set(`analyses/${loopwellAnalysis.id}/notes/note_00000000000000000000000001`, {
      id: "note_00000000000000000000000001",
      analysisId: loopwellAnalysis.id,
      sectionKey: "founder-team",
      text: "Follow up on this.",
      createdAt: new Date().toISOString(),
    });
    store.set("comparisons/cmp_00000000000000000000000001", {
      id: "cmp_00000000000000000000000001",
      ownerId: OWNER_ID,
      name: "Q4 comparison",
      items: [
        { analysisId: "ana_00000000000000000000000001", reportId: "rpt_00000000000000000000000001", label: "A", deleted: false },
        { analysisId: "ana_00000000000000000000000002", reportId: "rpt_00000000000000000000000002", label: "B", deleted: false },
      ],
      scoringVersions: ["1.0.0"],
      createdAt: new Date().toISOString(),
    });
    store.set("activity/act_00000000000000000000000001", {
      id: "act_00000000000000000000000001",
      ownerId: OWNER_ID,
      type: "ANALYSIS_CREATED",
      message: "Created Loopwell",
      createdAt: new Date().toISOString(),
    });
    store.set("feedback/fbk_00000000000000000000000001", {
      id: "fbk_00000000000000000000000001",
      ownerId: OWNER_ID,
      message: "Love the evidence rail.",
      createdAt: new Date().toISOString(),
    });

    const payload = await buildAccountExportPayload(db, OWNER_ID, repos(db));

    expect(payload.ownerId).toBe(OWNER_ID);
    expect(payload.analyses).toHaveLength(1);
    expect(payload.analyses[0]?.analysis.id).toBe(loopwellAnalysis.id);
    expect(payload.analyses[0]?.sources).toHaveLength(loopwellSources.length);
    expect(payload.analyses[0]?.runs).toHaveLength(1);
    expect(payload.analyses[0]?.reports).toHaveLength(1);
    expect(payload.analyses[0]?.notes).toHaveLength(1);
    expect(payload.comparisons).toHaveLength(1);
    expect(payload.activity).toHaveLength(1);
    expect(payload.feedback).toHaveLength(1);
  });

  it("excludes another owner's analyses, comparisons, activity and feedback", async () => {
    const { db, store } = createFakeFirestore();
    store.set(`analyses/${loopwellAnalysis.id}`, { ...loopwellAnalysis, ownerId: "someone-else" });
    store.set("comparisons/cmp_1", {
      id: "cmp_00000000000000000000000002",
      ownerId: "someone-else",
      name: "Not mine",
      items: [],
      scoringVersions: [],
      createdAt: new Date().toISOString(),
    });

    const payload = await buildAccountExportPayload(db, OWNER_ID, repos(db));

    expect(payload.analyses).toHaveLength(0);
    expect(payload.comparisons).toHaveLength(0);
  });
});
