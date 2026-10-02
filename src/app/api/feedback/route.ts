import { NextResponse } from "next/server";
import { z } from "zod";

import { requireUser } from "@/lib/api/auth";
import { handleApiError } from "@/lib/api/errors";
import { assertSameOrigin } from "@/lib/api/origin";
import { getAdminFirestore } from "@/lib/repos/admin-firestore";
import { FeedbackRepo } from "@/lib/repos/feedback-repo";
import { newId } from "@/lib/schema/ids";

const SubmitFeedbackBody = z.object({
  message: z.string().min(1).max(2000),
  page: z.string().max(200).optional(),
});

/**
 * T-6.11 (beta feedback loop, PRD section 13). No usage limit and no rate
 * limit beyond requiring a signed-in session — this is a low-volume,
 * human-typed form, not a mechanism anyone would script-abuse the way run
 * creation (DAILY_ANALYSIS_LIMIT) is. R-SEC-04: the message itself is the
 * user's own free text (not document content), so nothing here is exempt
 * from being logged if an error occurs — only the usual content-free
 * operational fields are.
 */
export async function POST(request: Request): Promise<NextResponse> {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    const body = SubmitFeedbackBody.parse(await request.json());

    const db = getAdminFirestore();
    await new FeedbackRepo(db).create({
      id: newId("fbk"),
      ownerId: user.uid,
      message: body.message,
      page: body.page,
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
