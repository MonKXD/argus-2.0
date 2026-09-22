import Link from "next/link";

import { Button } from "@/components/ui/button";

// DESIGN section 5.6: "ARGUS AI ... Sample report Sign in" — public-site
// header, separate from AppShell's Topbar (that's the authenticated shell).

function SiteHeader() {
  return (
    <header className="mx-auto flex max-w-[1360px] items-center justify-between px-4 py-6 lg:px-8">
      <span className="font-serif text-ui font-semibold text-foreground">ARGUS AI</span>
      <nav aria-label="Site" className="flex items-center gap-2">
        <Button asChild variant="ghost" size="sm">
          <Link href="/sample">Sample report</Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link href="/login">Sign in</Link>
        </Button>
      </nav>
    </header>
  );
}

export { SiteHeader };
