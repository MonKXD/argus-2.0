import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { SectionNotes } from "@/components/argus/section-notes";
import type { Note } from "@/lib/schema/note";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

const note: Note = {
  id: "note_00000000000000000000000001",
  analysisId: "ana_00000000000000000000000001",
  sectionKey: "founder-team",
  text: "Ask about the second hire.",
  createdAt: "2026-10-01T00:00:00.000Z",
};

describe("SectionNotes", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ note }), { status: 201 })));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders existing notes with a remove action", () => {
    render(<SectionNotes analysisId="ana_1" sectionKey="founder-team" notes={[note]} />);
    expect(screen.getByText("Ask about the second hire.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Remove note" })).toBeInTheDocument();
  });

  it("shows no notes when the list is empty, but still shows the add form", () => {
    render(<SectionNotes analysisId="ana_1" sectionKey="founder-team" notes={[]} />);
    expect(screen.queryByRole("button", { name: "Remove note" })).not.toBeInTheDocument();
    expect(screen.getByPlaceholderText("Add a note to this section…")).toBeInTheDocument();
  });

  it("disables Add note until there's text, then submits it", async () => {
    render(<SectionNotes analysisId="ana_1" sectionKey="founder-team" notes={[]} />);
    const addButton = screen.getByRole("button", { name: "Add note" });
    expect(addButton).toBeDisabled();

    const user = userEvent.setup();
    await user.type(screen.getByPlaceholderText("Add a note to this section…"), "Follow up");
    expect(addButton).toBeEnabled();

    await user.click(addButton);

    expect(fetch).toHaveBeenCalledWith("/api/analyses/ana_1/notes", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ sectionKey: "founder-team", text: "Follow up" }),
    });
  });
});
