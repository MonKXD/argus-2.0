import Link from "next/link";
import { notFound } from "next/navigation";

import { requireUser } from "@/lib/api/auth";
import { getAdminFirestore } from "@/lib/repos/admin-firestore";
import { ComparisonRepo } from "@/lib/repos/comparison-repo";

interface ComparePageProps {
  params: Promise<{ id: string }>;
}

/**
 * Minimal placeholder: name and the snapshotted items only. The real view
 * (radar overlay, score table with deltas, canonical-metric matrix —
 * FR-CMP-02/FR-CMP-03) is T-5.02's job; this page exists so "create, then
 * land somewhere real" (T-5.01's own scope) doesn't 404.
 */
export default async function ComparisonPage({ params }: ComparePageProps) {
  const { id } = await params;
  const user = await requireUser();

  const comparison = await new ComparisonRepo(getAdminFirestore()).get(id);
  if (!comparison || comparison.ownerId !== user.uid) notFound();

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="font-serif text-h2 text-foreground">{comparison.name}</h1>
        <p className="text-ui-sm text-mist">
          Created {new Date(comparison.createdAt).toLocaleDateString()}
        </p>
      </div>

      <ul className="flex flex-col gap-2">
        {comparison.items.map((item) => (
          <li key={item.analysisId} className="flex items-center gap-2">
            {item.deleted ? (
              <span className="text-ui-sm text-mist">{item.label} (deleted)</span>
            ) : (
              <Link
                href={`/app/analyses/${item.analysisId}`}
                className="text-ui-sm text-foreground underline underline-offset-4"
              >
                {item.label}
              </Link>
            )}
          </li>
        ))}
      </ul>

      <p className="text-ui-sm text-mist">
        The full comparison view (score deltas, radar overlay, metric matrix) is coming soon.
      </p>
    </div>
  );
}
