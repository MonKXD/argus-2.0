import Link from "next/link";

import { Button } from "@/components/ui/button";

function FinalCta() {
  return (
    <section className="mx-auto max-w-[1360px] px-4 py-16 lg:px-8">
      <div className="flex flex-col items-start gap-5 border-t border-hairline pt-16">
        <h2 className="font-serif text-h2 text-foreground">See what your next deck is missing.</h2>
        <div className="flex flex-wrap gap-3">
          <Button asChild size="lg">
            <Link href="/app/analyses/new">Start an analysis</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/sample">See a sample report</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

export { FinalCta };
