import { NextResponse } from "next/server";
import { z } from "zod";

import { requireUser } from "@/lib/api/auth";
import { handleApiError } from "@/lib/api/errors";
import { assertSameOrigin } from "@/lib/api/origin";
import { getAdminFirestore } from "@/lib/repos/admin-firestore";
import { AnalysisRepo } from "@/lib/repos/analysis-repo";
import { Analysis } from "@/lib/schema/analysis";
import { AnalysisStatus, Stage, StageProfile } from "@/lib/schema/enums";
import { newId } from "@/lib/schema/ids";

const CreateAnalysisBody = z.object({
  startup: Analysis.shape.startup,
  options: z
    .object({
      webResearch: z.boolean(),
      stageProfile: StageProfile.optional(),
      analystFocus: z.string().max(500).optional(),
    })
    .optional(),
});

/** FR-INT-01/FR-INT-06: create a draft, save it, resume later via PATCH. */
export async function POST(request: Request): Promise<NextResponse> {
  try {
    assertSameOrigin(request);
    const user = await requireUser();

    const body = CreateAnalysisBody.parse(await request.json());
    const now = new Date().toISOString();

    const analysis: Analysis = {
      id: newId("ana"),
      ownerId: user.uid,
      startup: body.startup,
      status: "DRAFT",
      // APP_FLOW 5.3 step 3: "Public web research toggle (default on...)".
      options: body.options ?? { webResearch: true },
      latest: null,
      currentRunId: null,
      tags: [],
      isWatchlisted: false,
      isDemo: false,
      createdAt: now,
      updatedAt: now,
      archivedAt: null,
    };

    await new AnalysisRepo(getAdminFirestore()).create(analysis);
    return NextResponse.json({ analysis }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

const SORTS = ["-updatedAt", "updatedAt", "name", "-name", "score", "-score"] as const;
const PAGE_SIZE = 20;

const ListQuery = z.object({
  status: AnalysisStatus.optional(),
  stage: Stage.optional(),
  sector: z.string().max(80).optional(),
  q: z.string().max(200).optional(),
  sort: z.enum(SORTS).default("-updatedAt"),
  cursor: z.string().optional(),
});

function sortAnalyses(analyses: Analysis[], sort: (typeof SORTS)[number]): Analysis[] {
  const desc = sort.startsWith("-");
  const key = desc ? sort.slice(1) : sort;
  const sorted = [...analyses].sort((a, b) => {
    if (key === "name") return a.startup.name.localeCompare(b.startup.name);
    if (key === "score") return (a.latest?.overallScore ?? -1) - (b.latest?.overallScore ?? -1);
    return a.updatedAt.localeCompare(b.updatedAt);
  });
  return desc ? sorted.reverse() : sorted;
}

/**
 * FR-DSH-01/FR-DSH-04. D-059: filtering (including free-text `q`), sorting
 * to anything other than the base Firestore order, and pagination all
 * happen in memory over one owner's full analysis list — see
 * AnalysisRepo.listByOwner's own comment for why that's an acceptable
 * trade-off here rather than new search infrastructure or a schema change.
 */
export async function GET(request: Request): Promise<NextResponse> {
  try {
    const user = await requireUser();
    const { searchParams } = new URL(request.url);
    const query = ListQuery.parse(Object.fromEntries(searchParams));

    let analyses = await new AnalysisRepo(getAdminFirestore()).listByOwner(user.uid);

    if (query.status) analyses = analyses.filter((a) => a.status === query.status);
    if (query.stage) analyses = analyses.filter((a) => a.startup.stage === query.stage);
    if (query.sector) analyses = analyses.filter((a) => a.startup.sector === query.sector);
    if (query.q) {
      const needle = query.q.trim().toLowerCase();
      analyses = analyses.filter((a) => a.startup.name.toLowerCase().includes(needle));
    }

    analyses = sortAnalyses(analyses, query.sort);

    const offset = query.cursor
      ? Number(Buffer.from(query.cursor, "base64url").toString("utf8"))
      : 0;
    const page = analyses.slice(offset, offset + PAGE_SIZE);
    const nextOffset = offset + PAGE_SIZE;
    const nextCursor =
      nextOffset < analyses.length ? Buffer.from(String(nextOffset)).toString("base64url") : null;

    return NextResponse.json({ analyses: page, nextCursor });
  } catch (error) {
    return handleApiError(error);
  }
}
