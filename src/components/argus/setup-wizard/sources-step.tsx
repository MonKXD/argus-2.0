"use client";

import { FileText, Link as LinkIcon, NotebookText, TriangleAlert, Upload } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSourceUpload } from "@/hooks/use-source-upload";
import type { SourceType } from "@/lib/schema/enums";
import { cn } from "@/lib/utils";

interface SourcesStepProps {
  analysisId: string;
}

const EXTENSION_TYPE_HINT: Record<string, SourceType> = {
  pdf: "PITCH_DECK",
  xlsx: "FINANCIAL_DOC",
  csv: "FINANCIAL_DOC",
  docx: "COMPANY_DOC",
  txt: "USER_NOTES",
  md: "USER_NOTES",
};

const SOURCE_TYPE_LABEL: Record<SourceType, string> = {
  PITCH_DECK: "Pitch deck",
  FINANCIAL_DOC: "Financial document",
  COMPANY_DOC: "Company document",
  WEBSITE: "Website",
  WEB_RESEARCH: "Web research",
  USER_NOTES: "Notes",
};

const TEXT_MAX = 20_000;

function suggestType(filename: string): SourceType {
  const extension = filename.split(".").pop()?.toLowerCase() ?? "";
  return EXTENSION_TYPE_HINT[extension] ?? "COMPANY_DOC";
}

function sourceIcon(source: { origin: string }) {
  if (source.origin === "URL") return LinkIcon;
  if (source.origin === "TEXT") return NotebookText;
  return FileText;
}

/**
 * APP_FLOW 5.3 step 2 / DESIGN 5.5's two-column layout. All three input
 * kinds are real: file upload (T-3.06, direct-to-Storage then server
 * validation) and URL/pasted text (T-3.07, both registered straight
 * through `POST /api/analyses/:id/sources`, crawled or split into
 * paragraphs, and status-checked the same way an upload is).
 */
function SourcesStep({ analysisId }: SourcesStepProps) {
  const {
    sources,
    uploading,
    loading,
    loadError,
    actionError,
    uploadFiles,
    addUrl,
    addText,
    removeSource,
  } = useSourceUpload(analysisId);
  const [url, setUrl] = React.useState("");
  const [addingUrl, setAddingUrl] = React.useState(false);
  const [text, setText] = React.useState("");
  const [addingText, setAddingText] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  function addFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    // One file may need a different type than another in the same drop
    // (a deck plus a spreadsheet); suggest per file rather than one type
    // for the whole batch.
    for (const file of Array.from(files)) {
      uploadFiles([file], suggestType(file.name));
    }
  }

  async function handleAddUrl() {
    const trimmed = url.trim();
    if (!trimmed || addingUrl) return;
    setAddingUrl(true);
    await addUrl(trimmed);
    setAddingUrl(false);
    setUrl("");
  }

  async function handleAddText() {
    const trimmed = text.trim();
    if (!trimmed || addingText) return;
    setAddingText(true);
    await addText(trimmed);
    setAddingText(false);
    setText("");
  }

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_260px]">
      <div className="flex flex-col gap-4">
        <div
          role="button"
          tabIndex={0}
          onClick={() => fileInputRef.current?.click()}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") fileInputRef.current?.click();
          }}
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            addFiles(event.dataTransfer.files);
          }}
          className={cn(
            "flex flex-col items-center gap-2 rounded-panel border border-dashed border-hairline-strong bg-panel px-4 py-8 text-center",
            "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
          )}
        >
          <Upload className="size-5 text-mist" aria-hidden="true" />
          <p className="text-ui-sm text-foreground">Drop files here, or click to choose</p>
          <p className="text-ui-sm text-mist">
            PDF, DOCX, XLSX, CSV, TXT or MD — pitch deck, financials, or other company documents
          </p>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.docx,.xlsx,.csv,.txt,.md"
            className="sr-only"
            onChange={(event) => {
              addFiles(event.target.files);
              event.target.value = "";
            }}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="source-url">Add a URL</Label>
          <div className="flex gap-2">
            <Input
              id="source-url"
              type="url"
              placeholder="https://"
              value={url}
              disabled={addingUrl}
              onChange={(event) => setUrl(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void handleAddUrl();
                }
              }}
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => void handleAddUrl()}
              disabled={addingUrl}
            >
              {addingUrl ? "Adding…" : "Add"}
            </Button>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="source-text">Paste text</Label>
          <textarea
            id="source-text"
            rows={3}
            maxLength={TEXT_MAX}
            placeholder="Founder notes, an email, anything relevant."
            disabled={addingText}
            className="rounded-control border border-border bg-panel-raised px-3 py-2 text-ui text-foreground outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
            value={text}
            onChange={(event) => setText(event.target.value)}
          />
          <Button
            type="button"
            variant="outline"
            className="self-start"
            onClick={() => void handleAddText()}
            disabled={addingText || !text.trim()}
          >
            {addingText ? "Adding…" : "Add text"}
          </Button>
        </div>

        {(loadError ?? actionError) && (
          <p role="alert" className="text-ui-sm text-destructive">
            {loadError ?? actionError}
          </p>
        )}

        {!loading && (sources.length > 0 || uploading.length > 0) && (
          <ul className="flex flex-col gap-2">
            {sources.map((source) => {
              const Icon = sourceIcon(source);
              const label = source.filename ?? source.url ?? source.title;
              return (
                <li
                  key={source.id}
                  className="flex items-center gap-2 rounded-control border border-hairline bg-panel px-3 py-2 text-ui-sm"
                >
                  <Icon className="size-4 shrink-0 text-mist" aria-hidden="true" />
                  <span className="min-w-0 flex-1 truncate text-foreground">{label}</span>
                  <span className="shrink-0 text-caption text-mist">
                    {SOURCE_TYPE_LABEL[source.type]}
                  </span>
                  {source.status === "FAILED" ? (
                    <span
                      className="flex shrink-0 items-center gap-1 rounded-control border border-destructive/40 px-1.5 py-0.5 text-caption text-destructive"
                      title={source.error?.message}
                    >
                      <TriangleAlert className="size-3" aria-hidden="true" />
                      Failed
                    </span>
                  ) : (
                    <span className="shrink-0 rounded-control border border-hairline-strong px-1.5 py-0.5 text-caption text-mist">
                      Parsed
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => void removeSource(source.id)}
                    aria-label={`Remove ${label}`}
                    className="shrink-0 text-mist hover:text-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                  >
                    ×
                  </button>
                </li>
              );
            })}

            {uploading.map((entry) => (
              <li
                key={entry.key}
                className="flex items-center gap-2 rounded-control border border-hairline bg-panel px-3 py-2 text-ui-sm"
              >
                <FileText className="size-4 shrink-0 text-mist" aria-hidden="true" />
                <span className="min-w-0 flex-1 truncate text-foreground">{entry.file.name}</span>
                {entry.phase === "failed" ? (
                  <span
                    className="flex shrink-0 items-center gap-1 rounded-control border border-destructive/40 px-1.5 py-0.5 text-caption text-destructive"
                    title={entry.errorMessage}
                  >
                    <TriangleAlert className="size-3" aria-hidden="true" />
                    Failed
                  </span>
                ) : (
                  <span
                    role="status"
                    className="shrink-0 rounded-control border border-hairline-strong px-1.5 py-0.5 text-caption text-mist"
                  >
                    {entry.phase === "uploading" ? `Uploading… ${entry.progress}%` : "Processing…"}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex flex-col gap-4 text-ui-sm text-mist">
        <p>A pitch deck plus a website gives the strongest first report.</p>
        <p>
          Uploaded material is sent to ARGUS&rsquo;s model provider, Anthropic, to extract evidence.
        </p>
      </div>
    </div>
  );
}

export { SourcesStep };
