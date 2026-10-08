import { IBM_Plex_Mono, IBM_Plex_Sans, Newsreader } from "next/font/google";

import { env } from "@/lib/env";

import type { Metadata } from "next";
import "./globals.css";

// Font roles per docs/DESIGN.md section 4.1: Newsreader for editorial content,
// IBM Plex Sans for interface, IBM Plex Mono for code and identifiers.
const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500"],
  style: ["normal", "italic"],
});

const ibmPlexSans = IBM_Plex_Sans({
  variable: "--font-ibm-plex-sans",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600"],
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-ibm-plex-mono",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500"],
});

const DESCRIPTION =
  "Evidence-first startup due diligence and investment intelligence platform.";

/**
 * T-6.15 (FR-LND-04, "SEO and social metadata"). `metadataBase` resolves
 * every relative URL below (and in `sitemap.ts`/`robots.ts`) against the
 * real deployed origin (R-SEC-03 already names `APP_URL` as a safe public
 * value). `openGraph`/`twitter` carry no `images` field — the sibling
 * `opengraph-image.tsx`/`twitter-image.tsx` file conventions generate and
 * attach those automatically, and file-based metadata takes priority over
 * this object's own, so duplicating the image path here would be dead
 * code, not a fallback.
 */
export const metadata: Metadata = {
  metadataBase: new URL(env.APP_URL),
  title: { default: "ARGUS AI", template: "%s — ARGUS AI" },
  description: DESCRIPTION,
  openGraph: {
    title: "ARGUS AI",
    description: DESCRIPTION,
    url: "/",
    siteName: "ARGUS AI",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "ARGUS AI",
    description: DESCRIPTION,
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${newsreader.variable} ${ibmPlexSans.variable} ${ibmPlexMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
