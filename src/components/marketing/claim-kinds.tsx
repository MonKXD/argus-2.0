import { EvidenceMarker } from "@/components/argus/evidence-marker";
import type { ClaimStatus } from "@/lib/schema/enums";

// DESIGN section 5.6: "the four kinds of statement (with examples)".

const KINDS: { status: ClaimStatus; label: string; description: string }[] = [
  {
    status: "VERIFIED",
    label: "Verified",
    description: "Backed by at least one quote that ARGUS checked against the source.",
  },
  {
    status: "AI_ANALYSIS",
    label: "AI analysis",
    description: "A conclusion the model drew from the evidence, shown with what it's based on.",
  },
  {
    status: "ASSUMPTION",
    label: "Assumption",
    description: "Not stated anywhere in the sources — flagged, with what would confirm it.",
  },
  {
    status: "MISSING",
    label: "Missing",
    description: "Information the analysis needed but didn't find, with a suggested source.",
  },
];

function ClaimKinds() {
  return (
    <section className="mx-auto max-w-[1360px] px-4 py-16 lg:px-8">
      <h2 className="font-serif text-h2 text-foreground">Four kinds of statement</h2>
      <p className="mt-2 max-w-prose text-body text-mist">
        Every line in a report carries one of these, so it is always clear how much to trust it.
      </p>
      <dl className="mt-8 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
        {KINDS.map((kind) => (
          <div key={kind.status} className="flex flex-col gap-2">
            <dt className="flex items-center gap-2 text-ui font-medium text-foreground">
              <EvidenceMarker status={kind.status} decorative />
              {kind.label}
            </dt>
            <dd className="text-ui-sm text-mist">{kind.description}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

export { ClaimKinds };
