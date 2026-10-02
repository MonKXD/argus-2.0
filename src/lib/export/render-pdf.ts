import { chromium } from "playwright-core";

import { env } from "@/lib/env";

/**
 * T-6.04 (FR-EXP-03, server-rendered PDF). Launches a real headless
 * Chromium and navigates to the already-built `/print/report/[id]`
 * (T-5.06) internally, so the PDF reuses 100% of that page's print CSS and
 * `PrintReport` component rather than re-implementing the layout a second
 * time in a different API — the exact tradeoff the user chose over a
 * pure-JS PDF library (R-COD-08, asked first).
 *
 * In production, `@sparticuz/chromium` provides a Chromium binary built
 * for Vercel's own serverless runtime (Amazon Linux) — the standard
 * pairing for this exact host, verified against `playwright-core`'s own
 * `browsers.json` (both pinned to Chromium 153, R-PRC-08). Local/CI dev
 * uses `playwright-core`'s normal browser resolution instead (the same
 * locally-cached/pre-installed Chromium Playwright's own e2e specs
 * already use) — sparticuz's Amazon-Linux-specific binary has no reason
 * to be exercised outside the real serverless target it's built for.
 */
async function launchChromium() {
  if (env.NODE_ENV === "production") {
    const sparticuzChromium = (await import("@sparticuz/chromium")).default;
    return chromium.launch({
      args: sparticuzChromium.args,
      executablePath: await sparticuzChromium.executablePath(),
    });
  }
  return chromium.launch();
}

export interface RenderReportPdfArgs {
  analysisId: string;
  reportId: string;
  /** The caller's own already-verified session cookie value, forwarded to
   * the internal navigation so the print page's own `requireUser()` check
   * passes as the same signed-in owner — no second auth path is minted. */
  sessionCookieValue: string;
}

export async function renderReportPdf(args: RenderReportPdfArgs): Promise<Buffer> {
  const browser = await launchChromium();
  try {
    const appUrl = new URL(env.APP_URL);
    const context = await browser.newContext();
    await context.addCookies([
      {
        name: env.SESSION_COOKIE_NAME,
        value: args.sessionCookieValue,
        domain: appUrl.hostname,
        path: "/",
        httpOnly: true,
        secure: appUrl.protocol === "https:",
        sameSite: "Lax",
      },
    ]);

    const page = await context.newPage();
    const printUrl = new URL(`/print/report/${args.analysisId}`, env.APP_URL);
    printUrl.searchParams.set("reportId", args.reportId);
    await page.goto(printUrl.toString(), { waitUntil: "networkidle" });

    const pdf = await page.pdf({ format: "Letter", printBackground: true, margin: { top: "0", bottom: "0", left: "0", right: "0" } });
    return pdf;
  } finally {
    await browser.close();
  }
}
