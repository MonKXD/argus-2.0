/**
 * PRD section 10's 16-section report spec, plus the reading-flow grouping
 * DESIGN's own ASCII layout implies ("16 sections grouped") but never
 * names outright — a small, reasoned presentational call (not asked): the
 * three groups follow the report's own narrative arc (orientation, the
 * per-dimension deep dive, and the cross-cutting assessment), with the
 * two data-reference sections kept separate since neither is a claim
 * section in the same sense as the other 14.
 */

export type ReportSectionGroup = "Overview" | "Deep dive" | "Assessment" | "Reference";

export interface ReportSectionMeta {
  /** Slug: both the DOM id (`<section id={id}>`) and the URL hash for deep links. */
  id: string;
  number: number;
  title: string;
  group: ReportSectionGroup;
}

export const REPORT_SECTIONS: ReportSectionMeta[] = [
  { id: "executive-summary", number: 1, title: "Executive summary", group: "Overview" },
  { id: "investment-overview", number: 2, title: "Investment overview", group: "Overview" },
  { id: "investment-score", number: 3, title: "Investment score", group: "Overview" },
  { id: "founder-team", number: 4, title: "Founder & team", group: "Deep dive" },
  { id: "product-business-model", number: 5, title: "Product & business model", group: "Deep dive" },
  { id: "market-opportunity", number: 6, title: "Market opportunity", group: "Deep dive" },
  { id: "market-trends", number: 7, title: "Market trends", group: "Deep dive" },
  { id: "competitive-landscape", number: 8, title: "Competitive landscape", group: "Deep dive" },
  { id: "traction-growth", number: 9, title: "Traction & growth", group: "Deep dive" },
  { id: "financial-signals", number: 10, title: "Financial signals", group: "Deep dive" },
  { id: "risks-flags", number: 11, title: "Risks & red flags", group: "Deep dive" },
  { id: "strengths-weaknesses", number: 12, title: "Strengths & weaknesses", group: "Assessment" },
  { id: "market-gaps", number: 13, title: "Market gaps", group: "Assessment" },
  { id: "ai-insights", number: 14, title: "AI insights", group: "Assessment" },
  { id: "evidence-sources", number: 15, title: "Evidence & sources", group: "Reference" },
  { id: "missing-information", number: 16, title: "Missing information", group: "Reference" },
];

const SECTION_IDS = REPORT_SECTIONS.map((s) => s.id);

/**
 * DESIGN section 6: "SectionNav | Sticky; scroll-spy". Given each section's
 * document-relative top offset (`getBoundingClientRect().top + window.scrollY`,
 * in document order) and the current scroll position, returns the id of
 * the section that should read as active: the last one whose top has
 * scrolled up past `activationOffset` (the sticky header's own height, so
 * a section counts as "current" once it's actually visible below it).
 * Pure so it's unit-testable without a real layout or IntersectionObserver,
 * which jsdom doesn't implement (same class of gap as `showModal()`,
 * PROJECT_MEMORY's gotchas) — the component wiring this to real scroll
 * events is Playwright's to verify.
 */
export function activeSectionId(sections: { id: string; top: number }[], scrollY: number, activationOffset: number): string | null {
  let active: string | null = null;
  for (const section of sections) {
    if (section.top - scrollY <= activationOffset) {
      active = section.id;
    } else {
      break;
    }
  }
  return active;
}

/** DESIGN section 6: "SectionNav | ... keyboard J/K" (next/previous section). */
export function adjacentSectionId(currentId: string | null, direction: "next" | "prev"): string {
  const index = currentId ? SECTION_IDS.indexOf(currentId) : -1;
  const nextIndex = direction === "next" ? index + 1 : index - 1;
  return SECTION_IDS[Math.min(Math.max(nextIndex, 0), SECTION_IDS.length - 1)]!;
}
