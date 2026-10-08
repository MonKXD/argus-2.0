import { ImageResponse } from "next/og";

/**
 * T-6.15 (FR-LND-04, "social metadata"). Next's file-convention route
 * (`opengraph-image.tsx` at the app root applies to every page unless a
 * segment defines its own) — `ImageResponse` renders with inline styles
 * only, no Tailwind utilities, so the two colours below are the real hex
 * values behind `--ink`/`--paper`/`--mist` (`src/styles/tokens.css`) rather
 * than a new, undocumented palette (DESIGN section 12/R-UI-02's "tokens
 * only" principle, applied the only way it can reach a context Tailwind's
 * class pipeline never touches).
 */
export const alt = "ARGUS AI — evidence-first startup due diligence";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "center",
          gap: 24,
          padding: 80,
          backgroundColor: "#0c1118",
          color: "#ece8df",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ fontSize: 72, fontWeight: 600 }}>ARGUS AI</div>
        <div style={{ fontSize: 32, color: "#aab3c2", maxWidth: 900 }}>
          Evidence-first startup due diligence. Every claim labelled Verified, AI analysis,
          Assumption or Missing.
        </div>
      </div>
    ),
    size,
  );
}
