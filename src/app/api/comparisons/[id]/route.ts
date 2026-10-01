import { NextResponse } from "next/server";

import { assertOwns, requireUser } from "@/lib/api/auth";
import { handleApiError, NotFoundError } from "@/lib/api/errors";
import { assertSameOrigin } from "@/lib/api/origin";
import { getAdminFirestore } from "@/lib/repos/admin-firestore";
import { ComparisonRepo } from "@/lib/repos/comparison-repo";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: RouteContext): Promise<NextResponse> {
  try {
    const { id } = await params;
    const user = await requireUser();

    const comparison = await new ComparisonRepo(getAdminFirestore()).get(id);
    if (!comparison) throw new NotFoundError("Comparison not found.");
    assertOwns(comparison.ownerId, user);

    return NextResponse.json({ comparison });
  } catch (error) {
    return handleApiError(error);
  }
}

/** FR-CMP-06's "delete." */
export async function DELETE(request: Request, { params }: RouteContext): Promise<NextResponse> {
  try {
    assertSameOrigin(request);
    const { id } = await params;
    const user = await requireUser();

    const repo = new ComparisonRepo(getAdminFirestore());
    const comparison = await repo.get(id);
    if (!comparison) throw new NotFoundError("Comparison not found.");
    assertOwns(comparison.ownerId, user);

    await repo.delete(id);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return handleApiError(error);
  }
}
