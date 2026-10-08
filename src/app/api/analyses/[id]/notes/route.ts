import { NextResponse } from "next/server";
import { z } from "zod";

import { assertOwns, requireUser } from "@/lib/api/auth";
import { handleApiError, NotFoundError, ValidationError } from "@/lib/api/errors";
import { assertSameOrigin } from "@/lib/api/origin";
import { REPORT_SECTIONS } from "@/lib/report-sections";
import { getAdminFirestore } from "@/lib/repos/admin-firestore";
import { AnalysisRepo } from "@/lib/repos/analysis-repo";
import { NoteRepo } from "@/lib/repos/note-repo";
import { newId } from "@/lib/schema/ids";
import { Note } from "@/lib/schema/note";

interface RouteContext {
  params: Promise<{ id: string }>;
}

const SECTION_IDS = new Set(REPORT_SECTIONS.map((s) => s.id));

const CreateNoteBody = z.object({
  sectionKey: z.string().max(60),
  text: z.string().trim().min(1, "Write something before saving.").max(1000),
});

/** FR-RPT-20 ("user notes on sections"). `sectionKey` is validated against
 * the real report-section list here, at the route boundary, rather than a
 * second Zod enum duplicating `report-sections.ts` (R-COD-02). */
export async function POST(request: Request, { params }: RouteContext): Promise<NextResponse> {
  try {
    assertSameOrigin(request);
    const { id: analysisId } = await params;
    const user = await requireUser();

    const analysis = await new AnalysisRepo(getAdminFirestore()).get(analysisId);
    if (!analysis) throw new NotFoundError("Analysis not found.");
    assertOwns(analysis.ownerId, user);

    const body = CreateNoteBody.parse(await request.json());
    if (!SECTION_IDS.has(body.sectionKey)) {
      throw new ValidationError("Unknown report section.");
    }

    const note: Note = {
      id: newId("note"),
      analysisId,
      sectionKey: body.sectionKey,
      text: body.text,
      createdAt: new Date().toISOString(),
    };

    await new NoteRepo(getAdminFirestore()).create(note);
    return NextResponse.json({ note }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function GET(_request: Request, { params }: RouteContext): Promise<NextResponse> {
  try {
    const { id: analysisId } = await params;
    const user = await requireUser();

    const analysis = await new AnalysisRepo(getAdminFirestore()).get(analysisId);
    if (!analysis) throw new NotFoundError("Analysis not found.");
    assertOwns(analysis.ownerId, user);

    const notes = await new NoteRepo(getAdminFirestore()).listByAnalysis(analysisId);
    return NextResponse.json({ notes });
  } catch (error) {
    return handleApiError(error);
  }
}
