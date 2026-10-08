"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import { useAddNote } from "@/hooks/use-add-note";
import { useDeleteNote } from "@/hooks/use-delete-note";
import { formatDate } from "@/lib/format";
import type { Note } from "@/lib/schema/note";

interface SectionNotesProps {
  analysisId: string;
  sectionKey: string;
  notes: Note[];
}

/**
 * FR-RPT-20 ("user notes on sections"). A small, always-visible block under
 * each of the report's 16 sections — existing notes (oldest first, so a
 * reader's own train of thought reads top to bottom) plus a one-line
 * add-note form. No dedicated Textarea primitive exists in this codebase
 * (D-079/D-107's own gotcha) — a plain, token-styled native `<textarea>`,
 * same as `FeedbackButton`'s.
 */
function SectionNotes({ analysisId, sectionKey, notes }: SectionNotesProps) {
  const [draft, setDraft] = React.useState("");
  const { adding, error: addError, addNote } = useAddNote(analysisId);
  const { deleting, error: deleteError, deleteNote } = useDeleteNote(analysisId);

  async function handleAdd() {
    const text = draft.trim();
    if (text.length === 0) return;
    await addNote(sectionKey, text);
    setDraft("");
  }

  return (
    <div className="mt-6 flex flex-col gap-3 border-t border-hairline pt-4">
      <h3 className="text-ui-sm font-medium text-foreground">Your notes</h3>
      {notes.length > 0 && (
        <ul className="flex flex-col gap-2">
          {notes.map((note) => (
            <li
              key={note.id}
              className="flex items-start justify-between gap-3 rounded-panel border border-hairline bg-panel p-3 text-ui-sm"
            >
              <div>
                <p className="text-foreground">{note.text}</p>
                <p className="mt-1 text-caption text-mist">{formatDate(note.createdAt)}</p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => void deleteNote(note.id)}
                disabled={deleting}
                aria-label="Remove note"
              >
                Remove
              </Button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex flex-col gap-2">
        <label htmlFor={`note-${sectionKey}`} className="sr-only">
          Add a note to this section
        </label>
        <textarea
          id={`note-${sectionKey}`}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={2}
          placeholder="Add a note to this section…"
          className="w-full resize-none rounded-control border border-hairline bg-panel-raised p-2 text-ui-sm text-foreground outline-none placeholder:text-mist focus-visible:ring-[3px] focus-visible:ring-ring/50"
        />
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void handleAdd()}
            disabled={adding || draft.trim().length === 0}
          >
            {adding ? "Saving…" : "Add note"}
          </Button>
        </div>
        {(addError ?? deleteError) && (
          <p role="alert" className="text-ui-sm text-destructive">
            {addError ?? deleteError}
          </p>
        )}
      </div>
    </div>
  );
}

export { SectionNotes };
