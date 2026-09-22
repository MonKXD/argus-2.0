// DESIGN section 5.6: "what ARGUS will not do (trust)". Original copy,
// grounded in the actual product rules (RULES.md R-AI-*), not marketing
// claims — each line here is a real constraint enforced in code.

const COMMITMENTS = [
  "Never invent a fact, quote or source. When something isn't in the evidence, the report says so.",
  "Never tell you to invest or pass. Reports show considerations and a score, not a verdict.",
  "Never let the model set its own score. Scores are computed by code from evidence the model found.",
  "Never describe a founder by anything but their professional history.",
];

function TrustSection() {
  return (
    <section className="mx-auto max-w-[1360px] px-4 py-16 lg:px-8">
      <h2 className="font-serif text-h2 text-foreground">What ARGUS will not do</h2>
      <ul className="mt-8 flex flex-col gap-4 sm:grid sm:grid-cols-2 sm:gap-x-8 sm:gap-y-4">
        {COMMITMENTS.map((commitment) => (
          <li key={commitment} className="max-w-prose text-body text-mist">
            {commitment}
          </li>
        ))}
      </ul>
    </section>
  );
}

export { TrustSection };
