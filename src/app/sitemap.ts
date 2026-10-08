import { env } from "@/lib/env";

import type { MetadataRoute } from "next";

/** T-6.15 (FR-LND-04). Every public, unauthenticated page — `/app/*` is
 * excluded (per-owner data, nothing for a crawler to index) the same way
 * `robots.ts` excludes it. */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = env.APP_URL;
  const now = new Date();

  return [
    { url: base, lastModified: now, changeFrequency: "monthly", priority: 1 },
    { url: `${base}/sample`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/login`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${base}/signup`, lastModified: now, changeFrequency: "yearly", priority: 0.5 },
    { url: `${base}/legal/terms`, lastModified: now, changeFrequency: "yearly", priority: 0.2 },
    { url: `${base}/legal/privacy`, lastModified: now, changeFrequency: "yearly", priority: 0.2 },
    {
      url: `${base}/legal/disclaimer`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.2,
    },
  ];
}
