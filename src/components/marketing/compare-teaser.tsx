import { demoAnalyses } from "@/demo";

// DESIGN section 5.6: "compare". Original copy — a brief teaser for the
// comparison feature (built in Phase 5), not the full compare view itself.

function CompareTeaser() {
  return (
    <section className="mx-auto max-w-[1360px] px-4 py-16 lg:px-8">
      <h2 className="font-serif text-h2 text-foreground">Compare startups side by side</h2>
      <p className="mt-2 max-w-prose text-body text-mist">
        Line up two to four analyses to see where they agree, where they diverge, and which
        canonical facts are missing from each.
      </p>
      <ul className="mt-8 flex flex-wrap gap-6">
        {demoAnalyses.map((analysis) => (
          <li
            key={analysis.id}
            className="flex min-w-40 flex-col gap-1 rounded-panel border border-hairline bg-panel px-4 py-3"
          >
            <span className="text-ui-sm text-foreground">{analysis.startup.name}</span>
            <span className="font-serif text-h3 tabular-nums text-foreground">
              {analysis.latest?.overallScore ?? "—"}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export { CompareTeaser };
