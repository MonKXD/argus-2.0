import Link from "next/link";

import { EmptyState } from "@/components/argus/empty-state";
import { formatDate } from "@/lib/format";
import type { Activity } from "@/lib/schema/activity";

// DESIGN section 5.2 / FR-DSH-07: "Recent activity" panel, right-column
// stack alongside WatchlistPanel. Each `Activity.message` is already a
// complete, readable sentence written at the point of recording (T-5.08's
// `recordActivity()` call sites) — this panel renders it as-is plus its
// timestamp, the same "server composes the sentence, UI just displays it"
// split WatchlistPanel's own score cell and AnalysesTable's status column
// already use, rather than re-deriving copy from `type` here.

interface RecentActivityPanelProps {
  activity: Activity[];
}

function RecentActivityPanel({ activity }: RecentActivityPanelProps) {
  return (
    <div className="rounded-panel border border-hairline p-4">
      <h3 className="text-ui font-medium text-foreground">Recent activity</h3>
      {activity.length === 0 ? (
        <EmptyState message="Nothing has happened yet." />
      ) : (
        <ul className="mt-2 flex flex-col gap-2">
          {activity.map((item) => (
            <li key={item.id} className="flex flex-col gap-0.5 text-ui-sm">
              {item.analysisId ? (
                <Link
                  href={`/app/analyses/${item.analysisId}`}
                  className="text-foreground hover:underline focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                >
                  {item.message}
                </Link>
              ) : (
                <span className="text-foreground">{item.message}</span>
              )}
              <span className="text-mist">{formatDate(item.createdAt)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export { RecentActivityPanel };
