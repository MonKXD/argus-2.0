import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { SourcesStep } from "@/components/argus/setup-wizard/sources-step";
import type { UseSourceUploadResult } from "@/hooks/use-source-upload";

const uploadFiles = vi.fn();
const addUrl = vi.fn();
const addText = vi.fn();
const removeSource = vi.fn();

function buildSource(overrides: Partial<UseSourceUploadResult> = {}): UseSourceUploadResult {
  return {
    sources: [],
    uploading: [],
    loading: false,
    loadError: null,
    actionError: null,
    uploadFiles,
    addUrl,
    addText,
    removeSource,
    ...overrides,
  } as UseSourceUploadResult;
}

describe("SourcesStep", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    addUrl.mockResolvedValue(undefined);
    addText.mockResolvedValue(undefined);
  });

  it("shows the drop zone, add-URL input and paste-text area", () => {
    render(<SourcesStep source={buildSource()} />);
    expect(screen.getByText(/drop files here/i)).toBeInTheDocument();
    expect(screen.getByLabelText("Add a URL")).toBeInTheDocument();
    expect(screen.getByLabelText("Paste text")).toBeInTheDocument();
  });

  it("renders a registered PARSED upload source with its type and a remove control", () => {
    const source = buildSource({
      sources: [
        {
          id: "src_1",
          origin: "UPLOAD",
          filename: "deck.pdf",
          title: "deck.pdf",
          type: "PITCH_DECK",
          status: "PARSED",
        },
      ] as UseSourceUploadResult["sources"],
    });
    render(<SourcesStep source={source} />);

    expect(screen.getByText("deck.pdf")).toBeInTheDocument();
    expect(screen.getByText("Pitch deck")).toBeInTheDocument();
    expect(screen.getByText("Parsed")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Remove deck.pdf" })).toBeInTheDocument();
  });

  it("renders a registered WEBSITE source by its url", () => {
    const source = buildSource({
      sources: [
        {
          id: "src_2",
          origin: "URL",
          url: "https://example.com",
          title: "https://example.com",
          type: "WEBSITE",
          status: "PARSED",
        },
      ] as UseSourceUploadResult["sources"],
    });
    render(<SourcesStep source={source} />);

    expect(screen.getByText("https://example.com")).toBeInTheDocument();
    expect(screen.getByText("Website")).toBeInTheDocument();
  });

  it("renders a registered TEXT source by its title", () => {
    const source = buildSource({
      sources: [
        { id: "src_3", origin: "TEXT", title: "Founder notes", type: "USER_NOTES", status: "PARSED" },
      ] as UseSourceUploadResult["sources"],
    });
    render(<SourcesStep source={source} />);

    expect(screen.getByText("Founder notes")).toBeInTheDocument();
    expect(screen.getByText("Notes")).toBeInTheDocument();
  });

  it("renders a FAILED source with its error as a title attribute", () => {
    const source = buildSource({
      sources: [
        {
          id: "src_1",
          origin: "UPLOAD",
          filename: "corrupt.pdf",
          title: "corrupt.pdf",
          type: "PITCH_DECK",
          status: "FAILED",
          error: { code: "PARSE_FAILED", message: "This file could not be read." },
        },
      ] as UseSourceUploadResult["sources"],
    });
    render(<SourcesStep source={source} />);

    const failedChip = screen.getByText("Failed");
    expect(failedChip.closest("span")).toHaveAttribute("title", "This file could not be read.");
  });

  it("shows an in-progress upload's percentage", () => {
    const source = buildSource({
      uploading: [{ key: "u1", file: new File([], "financials.xlsx"), progress: 42, phase: "uploading" }],
    });
    render(<SourcesStep source={source} />);

    expect(screen.getByText("Uploading… 42%")).toBeInTheDocument();
  });

  it("calls uploadFiles with the auto-suggested type when a file is chosen", async () => {
    const user = userEvent.setup();
    render(<SourcesStep source={buildSource()} />);

    const file = new File(["content"], "financials.xlsx", { type: "" });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(input, file);

    expect(uploadFiles).toHaveBeenCalledWith([file], "FINANCIAL_DOC");
  });

  it("calls removeSource when a registered source's remove button is clicked", async () => {
    const source = buildSource({
      sources: [
        {
          id: "src_1",
          origin: "UPLOAD",
          filename: "deck.pdf",
          title: "deck.pdf",
          type: "PITCH_DECK",
          status: "PARSED",
        },
      ] as UseSourceUploadResult["sources"],
    });
    const user = userEvent.setup();
    render(<SourcesStep source={source} />);

    await user.click(screen.getByRole("button", { name: "Remove deck.pdf" }));

    expect(removeSource).toHaveBeenCalledWith("src_1");
  });

  it("calls addUrl and clears the field when Add is clicked", async () => {
    const user = userEvent.setup();
    render(<SourcesStep source={buildSource()} />);

    const input = screen.getByLabelText("Add a URL");
    await user.type(input, "https://example.com");
    await user.click(screen.getByRole("button", { name: "Add" }));

    expect(addUrl).toHaveBeenCalledWith("https://example.com");
    expect(input).toHaveValue("");
  });

  it("calls addUrl on Enter in the URL field", async () => {
    const user = userEvent.setup();
    render(<SourcesStep source={buildSource()} />);

    await user.type(screen.getByLabelText("Add a URL"), "https://example.com{Enter}");

    expect(addUrl).toHaveBeenCalledWith("https://example.com");
  });

  it("calls addText and clears the field when Add text is clicked", async () => {
    const user = userEvent.setup();
    render(<SourcesStep source={buildSource()} />);

    const textarea = screen.getByLabelText("Paste text");
    await user.type(textarea, "Founder notes here.");
    await user.click(screen.getByRole("button", { name: "Add text" }));

    expect(addText).toHaveBeenCalledWith("Founder notes here.");
    expect(textarea).toHaveValue("");
  });

  it("disables Add text until there is non-whitespace content", async () => {
    const user = userEvent.setup();
    render(<SourcesStep source={buildSource()} />);

    expect(screen.getByRole("button", { name: "Add text" })).toBeDisabled();

    await user.type(screen.getByLabelText("Paste text"), "   ");
    expect(screen.getByRole("button", { name: "Add text" })).toBeDisabled();

    await user.type(screen.getByLabelText("Paste text"), "real content");
    expect(screen.getByRole("button", { name: "Add text" })).toBeEnabled();
  });

  it("shows the load error when the initial fetch failed", () => {
    const source = buildSource({ loadError: "Couldn't load your sources. Try reloading the page." });
    render(<SourcesStep source={source} />);

    expect(screen.getByRole("alert")).toHaveTextContent("Couldn't load your sources.");
  });

  it("shows the action error when adding a URL or text fails", () => {
    const source = buildSource({ actionError: "Couldn't add this URL. Check that it's valid and try again." });
    render(<SourcesStep source={source} />);

    expect(screen.getByRole("alert")).toHaveTextContent("Couldn't add this URL.");
  });
});
