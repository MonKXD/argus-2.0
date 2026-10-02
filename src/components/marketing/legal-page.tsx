import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteHeader } from "@/components/marketing/site-header";

/**
 * T-6.09 (FR-LND-03/PRD section 15): shared shell for the three legal pages
 * `SiteFooter`'s nav already links to (`/legal/terms`, `/legal/privacy`,
 * `/legal/disclaimer`) — one layout, one prose style, not three near-copies.
 */
function LegalPage({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-[760px] px-4 py-16 lg:px-8">
        <h1 className="font-serif text-h1 text-foreground">{title}</h1>
        <p className="mt-2 text-ui-sm text-mist">Last updated {updated}</p>
        <div className="mt-8 flex flex-col gap-6 text-body text-foreground [&_h2]:mt-4 [&_h2]:font-serif [&_h2]:text-h3 [&_h2]:text-foreground [&_p]:text-body [&_p]:text-mist [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:text-mist [&_li]:text-body">
          {children}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}

export { LegalPage };
