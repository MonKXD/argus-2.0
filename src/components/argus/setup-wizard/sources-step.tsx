"use client";

import { FileText, Link as LinkIcon, TriangleAlert, Upload } from "lucide-react";
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

function suggestType(filename: string): SourceType {
  const extension = filename.split(".").pop()?.toLowerCase() ?? "";
  return EXTENSION_TYPE_HINT[extension] ?? "COMPANY_DOC";
}

/**
 * APP_FLOW 5.3 step 2 / DESIGN 5.5's two-column layout. File upload is now
 * real (T-3.06: direct-to-Storage via `useSourceUpload`, then server
 * validation and registration). URL and pasted text stay a local-state-only
 * stub — that registration path is T-3.07's job, not yet built — so this
 * section keeps its own honest "not yet available" note, scoped to just
 * those two inputs now that files are real.
 */
function SourcesStep({ analysisId }: SourcesStepProps) {
  const { sources, uploading, loading, loadError, uploadFiles, removeSource } =
    useSourceUpload(analysisId);
  const [url, setUrl] = React.useState("");
  const [stagedUrls, setStagedUrls] = React.useState<string[]>([]);
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

  function addUrl() {
    const trimmed = url.trim();
    if (!trimmed) return;
    setStagedUrls((prev) => [...prev, trimmed]);
    setUrl("");
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
              onChange={(event) => setUrl(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  addUrl();
                }
              }}
            />
            <Button type="button" variant="outline" onClick={addUrl}>
              Add
            </Button>
          </div>
        </div>

        {loadError && (
          <p role="alert" className="text-ui-sm text-destructive">
            {loadError}
          </p>
        )}

        {!loading && (sources.length > 0 || uploading.length > 0 || stagedUrls.length > 0) && (
          <ul className="flex flex-col gap-2">
            {sources.map((source) => (
              <li
                key={source.id}
                className="flex items-center gap-2 rounded-control border border-hairline bg-panel px-3 py-2 text-ui-sm"
              >
                <FileText className="size-4 shrink-0 text-mist" aria-hidden="true" />
                <span className="min-w-0 flex-1 truncate text-foreground">
                  {source.filename ?? source.title}
                </span>
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
                  aria-label={`Remove ${source.filename ?? source.title}`}
                  className="shrink-0 text-mist hover:text-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                >
                  ×
                </button>
              </li>
            ))}

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

            {stagedUrls.map((stagedUrl, index) => (
              <li
                key={`${stagedUrl}-${index}`}
                className="flex items-center gap-2 rounded-control border border-hairline bg-panel px-3 py-2 text-ui-sm"
              >
                <LinkIcon className="size-4 shrink-0 text-mist" aria-hidden="true" />
                <span className="min-w-0 flex-1 truncate text-foreground">{stagedUrl}</span>
                <span className="shrink-0 rounded-control border border-hairline-strong px-1.5 py-0.5 text-caption text-mist">
                  Not yet added
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setStagedUrls((prev) => prev.filter((_, itemIndex) => itemIndex !== index))
                  }
                  aria-label={`Remove ${stagedUrl}`}
                  className="shrink-0 text-mist hover:text-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}

        <p role="status" className="text-ui-sm text-mist">
          Adding a URL here isn&rsquo;t available yet — links aren&rsquo;t saved to your draft. You
          can continue and add one once this is ready.
        </p>
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
