"use client";

import * as React from "react";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { activeSectionId, adjacentSectionId, REPORT_SECTIONS, type ReportSectionGroup } from "@/lib/report-sections";
import { cn } from "@/lib/utils";

const GROUPS: ReportSectionGroup[] = ["Overview", "Deep dive", "Assessment", "Reference"];
// Sticky app-shell header height plus a little breathing room, so a
// section reads as "current" once it's actually visible below the chrome.
const ACTIVATION_OFFSET = 96;

function scrollToSection(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

interface ReportSectionNavProps {
  className?: string;
}

/**
 * DESIGN section 6: "SectionNav | Sticky; scroll-spy; keyboard J/K." /
 * section 3.3's 768-1023px breakpoint: "Section nav becomes a top select."
 * Full mobile layout polish is T-4.13's job; this covers the two
 * breakpoints DESIGN actually names.
 */
function ReportSectionNav({ className }: ReportSectionNavProps) {
  const [activeId, setActiveId] = React.useState<string | null>(REPORT_SECTIONS[0]?.id ?? null);

  React.useEffect(() => {
    function measureAndSetActive() {
      const offsets = REPORT_SECTIONS.map((section) => {
        const el = document.getElementById(section.id);
        return { id: section.id, top: el ? el.getBoundingClientRect().top + window.scrollY : Infinity };
      });
      setActiveId(activeSectionId(offsets, window.scrollY, ACTIVATION_OFFSET));
    }

    // Deep link support: land on the right section when the URL already
    // carries a hash on load. The active-section state itself is always
    // set from `measureAndSetActive`'s own real DOM measurement, deferred
    // to a rAF rather than called synchronously in the effect body itself
    // (react-hooks/set-state-in-effect) — imperceptible, since it's still
    // the very next frame after mount.
    const initialHash = window.location.hash.slice(1);
    if (initialHash && REPORT_SECTIONS.some((s) => s.id === initialHash)) {
      document.getElementById(initialHash)?.scrollIntoView({ block: "start" });
    }
    const raf = requestAnimationFrame(measureAndSetActive);

    window.addEventListener("scroll", measureAndSetActive, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", measureAndSetActive);
    };
  }, []);

  React.useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;
      if (event.key !== "j" && event.key !== "k") return;
      event.preventDefault();
      scrollToSection(adjacentSectionId(activeId, event.key === "j" ? "next" : "prev"));
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeId]);

  function goTo(id: string) {
    scrollToSection(id);
    window.history.replaceState(null, "", `#${id}`);
    setActiveId(id);
  }

  return (
    <>
      <div className={cn("lg:hidden", className)}>
        <Select value={activeId ?? undefined} onValueChange={goTo}>
          <SelectTrigger aria-label="Jump to section" className="w-full">
            <SelectValue placeholder="Jump to section" />
          </SelectTrigger>
          <SelectContent>
            {REPORT_SECTIONS.map((section) => (
              <SelectItem key={section.id} value={section.id}>
                {section.number}. {section.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <nav aria-label="Report sections" className={cn("sticky top-6 hidden lg:block", className)}>
        <ol className="flex flex-col gap-4">
          {GROUPS.map((group) => (
            <li key={group}>
              <p className="text-caption text-mist">{group}</p>
              <ol className="mt-1 flex flex-col">
                {REPORT_SECTIONS.filter((section) => section.group === group).map((section) => (
                  <li key={section.id}>
                    <a
                      href={`#${section.id}`}
                      onClick={(event) => {
                        event.preventDefault();
                        goTo(section.id);
                      }}
                      aria-current={activeId === section.id ? "true" : undefined}
                      className={cn(
                        "block rounded-control px-2 py-1.5 text-ui-sm text-mist hover:text-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
                        activeId === section.id && "bg-panel-raised text-foreground",
                      )}
                    >
                      {section.title}
                    </a>
                  </li>
                ))}
              </ol>
            </li>
          ))}
        </ol>
      </nav>
    </>
  );
}

export { ReportSectionNav };
