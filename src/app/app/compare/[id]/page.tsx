import { notFound } from "next/navigation";

import { ComparisonView, type ComparisonItemView } from "@/components/argus/compare/comparison-view";
import { requireUser } from "@/lib/api/auth";
import { getAdminFirestore } from "@/lib/repos/admin-firestore";
import { ComparisonRepo } from "@/lib/repos/comparison-repo";
import { FactRepo } from "@/lib/repos/fact-repo";
import { ReportRepo } from "@/lib/repos/report-repo";

interface ComparePageProps {
  params: Promise<{ id: string }>;
}

/**
 * Loads the comparison's pinned snapshot data (R-DAT-04: `item.reportId`,
 * never the analysis's possibly-newer `latest`) and hands it to the pure
 * `ComparisonView` for rendering (FR-CMP-02/FR-CMP-03).
 */
export default async function ComparisonPage({ params }: ComparePageProps) {
  const { id } = await params;
  const user = await requireUser();

  const db = getAdminFirestore();
  const comparison = await new ComparisonRepo(db).get(id);
  if (!comparison || comparison.ownerId !== user.uid) notFound();

  const reportRepo = new ReportRepo(db);
  const factRepo = new FactRepo(db);

  const items: ComparisonItemView[] = [];
  for (const item of comparison.items) {
    if (item.deleted) continue;
    const report = await reportRepo.getReport(item.analysisId, item.reportId);
    if (!report) continue;
    const [dimensions, facts] = await Promise.all([
      reportRepo.listDimensions(item.analysisId, item.reportId),
      factRepo.list(item.analysisId),
    ]);
    items.push({ analysisId: item.analysisId, label: item.label, report, dimensions, facts });
  }

  return (
    <ComparisonView
      name={comparison.name}
      createdAt={comparison.createdAt}
      items={items}
      hasDeletedItems={comparison.items.some((i) => i.deleted)}
    />
  );
}
