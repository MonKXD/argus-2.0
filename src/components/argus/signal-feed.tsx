import Link from "next/link";

import { EmptyState } from "@/components/argus/empty-state";
import { DIMENSION_LABEL } from "@/lib/dimension-labels";
import type { Signal } from "@/lib/schema/signal";
import { SIGNAL_IMPACT_LABEL } from "@/lib/signal-impact-labels";

interface SignalWithCompany extends Signal {
  companyName: string;
}

interface SignalFeedProps {
  signals: SignalWithCompany[];
}

/**
 * T-6.02 (FR-WCH-03): "Signal feed with impact tags and a prompt to re-run
 * the analysis." Each row links to the source article, shows the plain-text
 * impact tag (no new colour, see `signal-impact-labels.ts`) and the related
 * dimension when the detector named one, and ends with a "Re-run analysis"
 * link straight into the wizard's review step — the same entry point
 * `ReportHeader`'s own "Run again" link uses (T-5.11/D-094), so a signal
 * worth acting on and a manual re-run both land in the same place.
 */
function SignalFeed({ signals }: SignalFeedProps) {
  if (signals.length === 0) {
    return <EmptyState message="No signals yet. Signals appear here once a watchlisted company has news." />;
  }

  return (
    <ul className="flex flex-col gap-3">
      {signals.map((signal) => (
        <li key={signal.id} className="rounded-panel border border-hairline bg-panel p-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center rounded-pill border border-border px-2 py-0.5 text-caption text-mist">
              {SIGNAL_IMPACT_LABEL[signal.impact]}
            </span>
            {signal.relatedDimension && (
              <span className="text-caption text-mist">{DIMENSION_LABEL[signal.relatedDimension]}</span>
            )}
            <span className="text-caption text-mist">{signal.companyName}</span>
          </div>
          <a
            href={signal.url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 block font-serif text-body text-foreground underline-offset-2 hover:underline"
          >
            {signal.title}
          </a>
          <p className="mt-1 text-ui-sm text-mist">{signal.summary}</p>
          <Link
            href={`/app/analyses/${signal.analysisId}/setup?step=review`}
            className="mt-2 inline-block text-ui-sm text-foreground underline-offset-2 hover:underline"
          >
            Re-run analysis
          </Link>
        </li>
      ))}
    </ul>
  );
}

export { SignalFeed };
export type { SignalFeedProps, SignalWithCompany };
