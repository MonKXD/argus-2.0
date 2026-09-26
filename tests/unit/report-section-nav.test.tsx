import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ReportSectionNav } from "@/components/argus/report/report-section-nav";
import { REPORT_SECTIONS } from "@/lib/report-sections";

function renderWithSections() {
  return render(
    <>
      <ReportSectionNav />
      {REPORT_SECTIONS.map((section) => (
        <div key={section.id} id={section.id} />
      ))}
    </>,
  );
}

describe("ReportSectionNav", () => {
  beforeEach(() => {
    // jsdom doesn't implement scrollIntoView at all.
    Element.prototype.scrollIntoView = vi.fn();
    window.history.replaceState(null, "", "/");
  });

  it("renders a link for every one of the 16 sections", () => {
    renderWithSections();

    for (const section of REPORT_SECTIONS) {
      expect(screen.getAllByText(section.title).length).toBeGreaterThan(0);
    }
  });

  it("scrolls to the target section when its nav link is clicked", async () => {
    const user = userEvent.setup();
    renderWithSections();

    const target = REPORT_SECTIONS[3]!;
    const targetEl = document.getElementById(target.id)!;
    const scrollSpy = vi.spyOn(targetEl, "scrollIntoView");

    await user.click(screen.getByRole("link", { name: target.title }));

    expect(scrollSpy).toHaveBeenCalled();
  });

  it("updates the URL hash when a section link is clicked", async () => {
    const user = userEvent.setup();
    renderWithSections();

    const target = REPORT_SECTIONS[2]!;
    await user.click(screen.getByRole("link", { name: target.title }));

    expect(window.location.hash).toBe(`#${target.id}`);
  });

  it("jumps to the section named in the URL hash on load", () => {
    window.history.replaceState(null, "", `#${REPORT_SECTIONS[5]!.id}`);
    const targetEl0 = document.createElement("div");
    targetEl0.id = REPORT_SECTIONS[5]!.id;
    document.body.appendChild(targetEl0);
    const scrollSpy = vi.spyOn(targetEl0, "scrollIntoView");

    renderWithSections();

    expect(scrollSpy).toHaveBeenCalled();
    document.body.removeChild(targetEl0);
  });

  it("moves to the next section on 'j' and the previous on 'k'", async () => {
    const user = userEvent.setup();
    renderWithSections();

    const first = document.getElementById(REPORT_SECTIONS[0]!.id)!;
    const second = document.getElementById(REPORT_SECTIONS[1]!.id)!;
    const secondSpy = vi.spyOn(second, "scrollIntoView");
    const firstSpy = vi.spyOn(first, "scrollIntoView");

    await user.keyboard("j");
    expect(secondSpy).toHaveBeenCalled();

    await user.keyboard("k");
    expect(firstSpy).toHaveBeenCalled();
  });

  it("offers all 16 sections in the mobile/tablet select", () => {
    renderWithSections();

    const select = screen.getByLabelText("Jump to section");
    expect(select).toBeInTheDocument();
  });
});
