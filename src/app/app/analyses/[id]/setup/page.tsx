import { notFound } from "next/navigation";
import { Suspense } from "react";

import { SetupWizard } from "@/components/argus/setup-wizard/setup-wizard";
import { requireUser } from "@/lib/api/auth";
import { getAdminFirestore } from "@/lib/repos/admin-firestore";
import { AnalysisRepo } from "@/lib/repos/analysis-repo";

interface SetupPageProps {
  params: Promise<{ id: string }>;
}

/**
 * APP_FLOW 5.3: `?step=basics|sources|options|review`. A different user's
 * or a missing analysis both render as 404 (not 403) — an owner-scoped
 * page shouldn't confirm another id exists, same reasoning the API routes
 * (T-3.04) already follow with their own assertOwns(). Server component
 * loads through the repo directly (TRD 5.10); the wizard itself is a
 * client component that saves each step via the real PATCH endpoint.
 */
export default async function SetupPage({ params }: SetupPageProps) {
  const { id } = await params;
  const user = await requireUser();

  const analysis = await new AnalysisRepo(getAdminFirestore()).get(id);
  if (!analysis || analysis.ownerId !== user.uid) notFound();

  return (
    <Suspense>
      <SetupWizard analysis={analysis} />
    </Suspense>
  );
}
