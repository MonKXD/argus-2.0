import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { SourcesStep } from "@/components/argus/setup-wizard/sources-step";

const uploadFiles = vi.fn();
const addUrl = vi.fn();
const addText = vi.fn();
const removeSource = vi.fn();
let hookState: {
  sources: unknown[];
  uploading: unknown[];
  loading: boolean;
  loadError: string | null;
  actionError: string | null;
};

vi.mock("@/hooks/use-source-upload", () => ({
  useSourceUpload: () => ({
    ...hookState,
    uploadFiles,
    addUrl,
    addText,
    removeSource,
  }),
}));

const ANALYSIS_ID = "ana_00000000000000000000000001";

describe("SourcesStep", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    addUrl.mockResolvedValue(undefined);
    addText.mockResolvedValue(undefined);
    hookState = { sources: [], uploading: [], loading: false, loadError: null, actionError: null };
  });

  it("shows the drop zone, add-URL input and paste-text area", () => {
    render(<SourcesStep analysisId={ANALYSIS_ID} />);
    expect(screen.getByText(/drop files here/i)).toBeInTheDocument();
    expect(screen.getByLabelText("Add a URL")).toBeInTheDocument();
    expect(screen.getByLabelText("Paste text")).toBeInTheDocument();
  });

  it("renders a registered PARSED upload source with its type and a remove control", () => {
    hookState.sources = [
      {
        id: "src_1",
        origin: "UPLOAD",
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

  it("renders a registered WEBSITE source by its url", () => {
    hookState.sources = [
      {
        id: "src_2",
        origin: "URL",
        url: "https://example.com",
        title: "https://example.com",
        type: "WEBSITE",
        status: "PARSED",
      },
    ];
    render(<SourcesStep analysisId={ANALYSIS_ID} />);

    expect(screen.getByText("https://example.com")).toBeInTheDocument();
    expect(screen.getByText("Website")).toBeInTheDocument();
  });

  it("renders a registered TEXT source by its title", () => {
    hookState.sources = [
      {
        id: "src_3",
        origin: "TEXT",
        title: "Founder notes",
        type: "USER_NOTES",
        status: "PARSED",
      },
    ];
    render(<SourcesStep analysisId={ANALYSIS_ID} />);

    expect(screen.getByText("Founder notes")).toBeInTheDocument();
    expect(screen.getByText("Notes")).toBeInTheDocument();
  });

  it("renders a FAILED source with its error as a title attribute", () => {
    hookState.sources = [
      {
        id: "src_1",
        origin: "UPLOAD",
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
      {
        id: "src_1",
        origin: "UPLOAD",
        filename: "deck.pdf",
        title: "deck.pdf",
        type: "PITCH_DECK",
        status: "PARSED",
      },
    ];
    const user = userEvent.setup();
    render(<SourcesStep analysisId={ANALYSIS_ID} />);

    await user.click(screen.getByRole("button", { name: "Remove deck.pdf" }));

    expect(removeSource).toHaveBeenCalledWith("src_1");
  });

  it("calls addUrl and clears the field when Add is clicked", async () => {
    const user = userEvent.setup();
    render(<SourcesStep analysisId={ANALYSIS_ID} />);

    const input = screen.getByLabelText("Add a URL");
    await user.type(input, "https://example.com");
    await user.click(screen.getByRole("button", { name: "Add" }));

    expect(addUrl).toHaveBeenCalledWith("https://example.com");
    expect(input).toHaveValue("");
  });

  it("calls addUrl on Enter in the URL field", async () => {
    const user = userEvent.setup();
    render(<SourcesStep analysisId={ANALYSIS_ID} />);

    await user.type(screen.getByLabelText("Add a URL"), "https://example.com{Enter}");

    expect(addUrl).toHaveBeenCalledWith("https://example.com");
  });

  it("calls addText and clears the field when Add text is clicked", async () => {
    const user = userEvent.setup();
    render(<SourcesStep analysisId={ANALYSIS_ID} />);

    const textarea = screen.getByLabelText("Paste text");
    await user.type(textarea, "Founder notes here.");
    await user.click(screen.getByRole("button", { name: "Add text" }));

    expect(addText).toHaveBeenCalledWith("Founder notes here.");
    expect(textarea).toHaveValue("");
  });

  it("disables Add text until there is non-whitespace content", async () => {
    const user = userEvent.setup();
    render(<SourcesStep analysisId={ANALYSIS_ID} />);

    expect(screen.getByRole("button", { name: "Add text" })).toBeDisabled();

    await user.type(screen.getByLabelText("Paste text"), "   ");
    expect(screen.getByRole("button", { name: "Add text" })).toBeDisabled();

    await user.type(screen.getByLabelText("Paste text"), "real content");
    expect(screen.getByRole("button", { name: "Add text" })).toBeEnabled();
  });

  it("shows the load error when the initial fetch failed", () => {
    hookState.loadError = "Couldn't load your sources. Try reloading the page.";
    render(<SourcesStep analysisId={ANALYSIS_ID} />);

    expect(screen.getByRole("alert")).toHaveTextContent("Couldn't load your sources.");
  });

  it("shows the action error when adding a URL or text fails", () => {
    hookState.actionError = "Couldn't add this URL. Check that it's valid and try again.";
    render(<SourcesStep analysisId={ANALYSIS_ID} />);

    expect(screen.getByRole("alert")).toHaveTextContent("Couldn't add this URL.");
  });
});
