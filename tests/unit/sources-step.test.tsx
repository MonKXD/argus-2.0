import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { SourcesStep } from "@/components/argus/setup-wizard/sources-step";

const uploadFiles = vi.fn();
const removeSource = vi.fn();
let hookState: {
  sources: unknown[];
  uploading: unknown[];
  loading: boolean;
  loadError: string | null;
};

vi.mock("@/hooks/use-source-upload", () => ({
  useSourceUpload: () => ({
    ...hookState,
    uploadFiles,
    removeSource,
  }),
}));

const ANALYSIS_ID = "ana_00000000000000000000000001";

describe("SourcesStep", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hookState = { sources: [], uploading: [], loading: false, loadError: null };
  });

  it("shows the drop zone and add-URL input", () => {
    render(<SourcesStep analysisId={ANALYSIS_ID} />);
    expect(screen.getByText(/drop files here/i)).toBeInTheDocument();
    expect(screen.getByLabelText("Add a URL")).toBeInTheDocument();
  });

  it("renders a registered PARSED source with its type and a remove control", () => {
    hookState.sources = [
      {
        id: "src_1",
        filename: "deck.pdf",
        title: "deck.pdf",
        type: "PITCH_DECK",
        status: "PARSED",
      },
    ];
    render(<SourcesStep analysisId={ANALYSIS_ID} />);

    expect(screen.getByText("deck.pdf")).toBeInTheDocument();
    expect(screen.getByText("Pitch deck")).toBeInTheDocument();
    expect(screen.getByText("Parsed")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Remove deck.pdf" })).toBeInTheDocument();
  });

  it("renders a FAILED source with its error as a title attribute", () => {
    hookState.sources = [
      {
        id: "src_1",
        filename: "corrupt.pdf",
        title: "corrupt.pdf",
        type: "PITCH_DECK",
        status: "FAILED",
        error: { code: "PARSE_FAILED", message: "This file could not be read." },
      },
    ];
    render(<SourcesStep analysisId={ANALYSIS_ID} />);

    const failedChip = screen.getByText("Failed");
    expect(failedChip.closest("span")).toHaveAttribute("title", "This file could not be read.");
  });

  it("shows an in-progress upload's percentage", () => {
    hookState.uploading = [
      { key: "u1", file: new File([], "financials.xlsx"), progress: 42, phase: "uploading" },
    ];
    render(<SourcesStep analysisId={ANALYSIS_ID} />);

    expect(screen.getByText("Uploading… 42%")).toBeInTheDocument();
  });

  it("calls uploadFiles with the auto-suggested type when a file is chosen", async () => {
    const user = userEvent.setup();
    render(<SourcesStep analysisId={ANALYSIS_ID} />);

    const file = new File(["content"], "financials.xlsx", { type: "" });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(input, file);

    expect(uploadFiles).toHaveBeenCalledWith([file], "FINANCIAL_DOC");
  });

  it("calls removeSource when a registered source's remove button is clicked", async () => {
    hookState.sources = [
      { id: "src_1", filename: "deck.pdf", title: "deck.pdf", type: "PITCH_DECK", status: "PARSED" },
    ];
    const user = userEvent.setup();
    render(<SourcesStep analysisId={ANALYSIS_ID} />);

    await user.click(screen.getByRole("button", { name: "Remove deck.pdf" }));

    expect(removeSource).toHaveBeenCalledWith("src_1");
  });

  it("stages a URL locally without saving it", async () => {
    const user = userEvent.setup();
    render(<SourcesStep analysisId={ANALYSIS_ID} />);

    await user.type(screen.getByLabelText("Add a URL"), "https://example.com");
    await user.click(screen.getByRole("button", { name: "Add" }));

    expect(screen.getByText("https://example.com")).toBeInTheDocument();
    expect(screen.getByText("Not yet added")).toBeInTheDocument();
  });

  it("shows the load error when the initial fetch failed", () => {
    hookState.loadError = "Couldn't load your sources. Try reloading the page.";
    render(<SourcesStep analysisId={ANALYSIS_ID} />);

    expect(screen.getByRole("alert")).toHaveTextContent("Couldn't load your sources.");
  });
});
