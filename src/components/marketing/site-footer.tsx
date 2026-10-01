import Link from "next/link";

import { DISCLAIMER_TEXT } from "@/lib/disclaimer";

// PRD section 15: the disclaimer is required verbatim on the landing footer,
// report footer, and every export. Terms/privacy/disclaimer pages themselves
// ship in Phase 6 — the links are real destinations, just not built yet.

function SiteFooter() {
  return (
    <footer className="border-t border-hairline">
      <div className="mx-auto flex max-w-[1360px] flex-col gap-4 px-4 py-10 lg:px-8">
        <p className="max-w-prose text-ui-sm text-mist">{DISCLAIMER_TEXT}</p>
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
