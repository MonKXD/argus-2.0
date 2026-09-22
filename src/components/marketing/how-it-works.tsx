// DESIGN section 5.6: "how it works (numbered, because it is a sequence)".
// Original copy — DESIGN doesn't specify exact wording for this section,
// only its order and that it's numbered.

const STEPS = [
  {
    title: "Add your sources",
    description: "Upload a pitch deck, link a website, and add your own notes.",
  },
  {
    title: "ARGUS extracts evidence",
    description: "Every fact is pulled out with its exact quote, source and location.",
  },
  {
    title: "Eight dimensions get analysed",
    description:
      "Founder, market, product, traction, competitive, business model, financial and risk.",
  },
  {
    title: "You get a report and a score",
    description: "Every statement is labelled, and the score is computed by code, not the model.",
  },
];

function HowItWorks() {
  return (
    <section className="mx-auto max-w-[1360px] px-4 py-16 lg:px-8">
      <h2 className="font-serif text-h2 text-foreground">How it works</h2>
      <ol className="mt-8 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
        {STEPS.map((step, i) => (
          <li key={step.title} className="flex flex-col gap-2">
            <span className="font-serif text-h3 text-mist tabular-nums">{i + 1}</span>
            <h3 className="text-ui font-medium text-foreground">{step.title}</h3>
            <p className="text-ui-sm text-mist">{step.description}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

export { HowItWorks };
