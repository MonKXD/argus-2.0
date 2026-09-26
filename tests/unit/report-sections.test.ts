import { describe, expect, it } from "vitest";

import { activeSectionId, adjacentSectionId, REPORT_SECTIONS } from "@/lib/report-sections";

describe("REPORT_SECTIONS", () => {
  it("has exactly the 16 sections from PRD section 10, in order", () => {
    expect(REPORT_SECTIONS).toHaveLength(16);
    expect(REPORT_SECTIONS.map((s) => s.number)).toEqual(Array.from({ length: 16 }, (_, i) => i + 1));
  });

  it("has a unique id per section, safe as both a DOM id and a URL hash", () => {
    const ids = REPORT_SECTIONS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^[a-z0-9-]+$/);
  });
});

describe("activeSectionId", () => {
  const sections = [
    { id: "a", top: 0 },
    { id: "b", top: 500 },
    { id: "c", top: 1000 },
  ];

  it("picks the last section whose top has scrolled past the activation offset", () => {
    expect(activeSectionId(sections, 0, 100)).toBe("a");
    expect(activeSectionId(sections, 450, 100)).toBe("b");
    expect(activeSectionId(sections, 950, 100)).toBe("c");
  });

  it("returns null before any section has reached the activation offset", () => {
    expect(activeSectionId(sections, 0, -50)).toBeNull();
  });

  it("stays on the last section once scrolled past the final one", () => {
    expect(activeSectionId(sections, 5000, 100)).toBe("c");
  });
});

describe("adjacentSectionId", () => {
  const firstId = REPORT_SECTIONS[0]!.id;
  const secondId = REPORT_SECTIONS[1]!.id;
  const lastId = REPORT_SECTIONS[REPORT_SECTIONS.length - 1]!.id;

  it("moves to the next section", () => {
    expect(adjacentSectionId(firstId, "next")).toBe(secondId);
  });

  it("moves to the previous section", () => {
    expect(adjacentSectionId(secondId, "prev")).toBe(firstId);
  });

  it("clamps at the first section when already there", () => {
    expect(adjacentSectionId(firstId, "prev")).toBe(firstId);
  });

  it("clamps at the last section when already there", () => {
    expect(adjacentSectionId(lastId, "next")).toBe(lastId);
  });

  it("starts from the first section when nothing is active yet", () => {
    expect(adjacentSectionId(null, "next")).toBe(firstId);
    expect(adjacentSectionId(null, "prev")).toBe(firstId);
  });
});
