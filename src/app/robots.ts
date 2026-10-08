import { env } from "@/lib/env";

import type { MetadataRoute } from "next";

/**
 * T-6.15 (FR-LND-04). `/app/*` and `/api/*` are gated by `requireUser()`
 * anyway (R-SEC-01), but disallowing them here saves crawl budget on pages
 * a crawler can never actually render — only the public marketing/legal
 * pages (and `/sample`, FR-LND-02's demo report) are worth indexing.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/app/", "/api/", "/print/"],
    },
    sitemap: `${env.APP_URL}/sitemap.xml`,
  };
}
