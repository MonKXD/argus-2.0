import { Button } from "@/components/ui/button";
import type { Analysis } from "@/lib/schema/analysis";

interface ReviewStepProps {
  startup: Analysis["startup"];
  options: Analysis["options"];
  hasUsableSource: boolean;
  starting: boolean;
  onStart: () => void;
}

const STAGE_LABELS: Record<Analysis["startup"]["stage"], string> = {
  UNKNOWN: "Not specified",
  PRE_SEED: "Pre-seed",
  SEED: "Seed",
  SERIES_A: "Series A",
  SERIES_B_PLUS: "Series B+",
};

/**
 * APP_FLOW 5.3 step 4: summary, what's sent to the model provider, expected
 * duration, disclaimer. PRD section 15 requires the third-party-processing
 * disclosure "at upload time" — reiterated here since review is the last
 * point before anything is analysed. "Start analysis" now calls the real
 * `POST /api/analyses/:id/runs` (T-3.08's orchestrator, T-3.09's wiring) and
 * is disabled until at least one non-failed source exists, per APP_FLOW
 * 5.3 row 4's "Run disabled until valid" (row 2's own validation: "at least
 * one source or a website URL").
 */
function ReviewStep({ startup, options, hasUsableSource, starting, onStart }: ReviewStepProps) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h3 className="text-ui font-medium text-foreground">Startup</h3>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-ui-sm">
          <dt className="text-mist">Name</dt>
          <dd className="text-foreground">{startup.name || "Not set"}</dd>
          <dt className="text-mist">Website</dt>
          <dd className="text-foreground">{startup.website || "Not set"}</dd>
          <dt className="text-mist">Stage</dt>
          <dd className="text-foreground">{STAGE_LABELS[startup.stage]}</dd>
          <dt className="text-mist">Sector</dt>
          <dd className="text-foreground">{startup.sector || "Not set"}</dd>
        </dl>
      </div>

      <div className="flex flex-col gap-2">
        <h3 className="text-ui font-medium text-foreground">Options</h3>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-ui-sm">
          <dt className="text-mist">Public web research</dt>
          <dd className="text-foreground">{options.webResearch ? "On" : "Off"}</dd>
          <dt className="text-mist">Analyst focus</dt>
          <dd className="text-foreground">{options.analystFocus || "None"}</dd>
        </dl>
      </div>

      <div className="rounded-panel border border-hairline bg-panel p-4 text-ui-sm text-mist">
        <p>
          Your sources and notes are sent to Anthropic, ARGUS&rsquo;s model provider, to extract and
          analyse evidence. A typical run takes a few minutes.
        </p>
        <p className="mt-2">
          ARGUS AI is a research and intelligence tool. It does not provide investment, legal, tax
          or financial advice, and its outputs are not a substitute for professional due diligence.
          Verify all material facts independently.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <Button
          type="button"
          onClick={onStart}
          disabled={starting || !hasUsableSource}
          title={hasUsableSource ? undefined : "Add at least one source or a website URL first."}
        >
          {starting ? "Starting…" : "Start analysis"}
        </Button>
        {!hasUsableSource && (
          <p className="text-ui-sm text-mist">Add at least one source or a website URL first.</p>
        )}
      </div>
    </div>
  );
}

export { ReviewStep };
