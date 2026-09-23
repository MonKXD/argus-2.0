"use client";

import { FileText, Link as LinkIcon, Upload } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface StagedSource {
  id: string;
  label: string;
  kind: "file" | "url" | "text";
}

/**
 * APP_FLOW 5.3 step 2 / DESIGN 5.5's two-column layout. Staged locally only
 * — registering a file, URL or pasted text as a real Source (POST
 * /api/analyses/:id/sources) needs the upload flow and URL/text ingestion
 * that don't exist yet (separate tasks), so this collects a preview list
 * and says so plainly rather than pretending to save it (never blocks on
 * this being optional, per APP_FLOW's own "never blocks on optional
 * inputs" — the wizard can still be saved and resumed without any source
 * staged here).
 */
function SourcesStep() {
  const [staged, setStaged] = React.useState<StagedSource[]>([]);
  const [url, setUrl] = React.useState("");
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  function addFiles(files: FileList | null) {
    if (!files) return;
    setStaged((prev) => [
      ...prev,
      ...Array.from(files).map((file) => ({
        id: `${file.name}-${file.size}-${prev.length + Math.random()}`,
        label: file.name,
        kind: "file" as const,
      })),
    ]);
  }

  function addUrl() {
    const trimmed = url.trim();
    if (!trimmed) return;
    setStaged((prev) => [
      ...prev,
      { id: `${trimmed}-${prev.length}`, label: trimmed, kind: "url" },
    ]);
    setUrl("");
  }

  function removeStaged(id: string) {
    setStaged((prev) => prev.filter((item) => item.id !== id));
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
          <p className="text-ui-sm text-mist">Pitch deck, financials, or other company documents</p>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="sr-only"
            onChange={(event) => addFiles(event.target.files)}
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

        {staged.length > 0 && (
          <ul className="flex flex-col gap-2">
            {staged.map((item) => (
              <li
                key={item.id}
                className="flex items-center gap-2 rounded-control border border-hairline bg-panel px-3 py-2 text-ui-sm"
              >
                {item.kind === "url" ? (
                  <LinkIcon className="size-4 shrink-0 text-mist" aria-hidden="true" />
                ) : (
                  <FileText className="size-4 shrink-0 text-mist" aria-hidden="true" />
                )}
                <span className="min-w-0 flex-1 truncate text-foreground">{item.label}</span>
                <span className="shrink-0 rounded-control border border-hairline-strong px-1.5 py-0.5 text-caption text-mist">
                  Not yet added
                </span>
                <button
                  type="button"
                  onClick={() => removeStaged(item.id)}
                  aria-label={`Remove ${item.label}`}
                  className="shrink-0 text-mist hover:text-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}

        <p role="status" className="text-ui-sm text-mist">
          Adding sources here isn&rsquo;t available yet — files, links and pasted notes aren&rsquo;t
          saved to your draft. You can continue and add real sources once this is ready.
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
