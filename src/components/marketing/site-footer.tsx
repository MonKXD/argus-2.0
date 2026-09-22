import Link from "next/link";

// PRD section 15: the disclaimer is required verbatim on the landing footer,
// report footer, and every export. Terms/privacy/disclaimer pages themselves
// ship in Phase 6 — the links are real destinations, just not built yet.

function SiteFooter() {
  return (
    <footer className="border-t border-hairline">
      <div className="mx-auto flex max-w-[1360px] flex-col gap-4 px-4 py-10 lg:px-8">
        <p className="max-w-prose text-ui-sm text-mist">
          ARGUS AI is a research and intelligence tool. It does not provide investment, legal, tax
          or financial advice, and its outputs are not a substitute for professional due diligence.
          Verify all material facts independently.
        </p>
        <nav aria-label="Legal" className="flex flex-wrap gap-4 text-ui-sm">
          <Link href="/legal/terms" className="text-mist hover:text-foreground">
            Terms
          </Link>
          <Link href="/legal/privacy" className="text-mist hover:text-foreground">
            Privacy
          </Link>
          <Link href="/legal/disclaimer" className="text-mist hover:text-foreground">
            Disclaimer
          </Link>
        </nav>
      </div>
    </footer>
  );
}

export { SiteFooter };
