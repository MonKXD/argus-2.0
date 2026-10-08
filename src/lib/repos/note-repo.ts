import { zodConverter } from "@/lib/repos/converter";
import { Note } from "@/lib/schema/note";

import type { CollectionReference, Firestore } from "firebase-admin/firestore";

/**
 * Firestore-backed repository for `analyses/{id}/notes` (SCHEMA.md section
 * 6, T-6.14/FR-RPT-20). Structurally a smaller version of `SourceRepo`'s
 * per-analysis subcollection pattern — notes have no evidence to batch
 * alongside them, so `create`/`listByAnalysis`/`delete` are all this needs.
 */
export class NoteRepo {
  constructor(private readonly db: Firestore) {}

  private notes(analysisId: string): CollectionReference<Note> {
    return this.db
      .collection("analyses")
      .doc(analysisId)
      .collection("notes")
      .withConverter(zodConverter(Note));
  }

  async create(note: Note): Promise<void> {
    await this.notes(note.analysisId).doc(note.id).set(note);
  }

  /** Every note for an analysis, oldest first (matches reading order within a section). */
  async listByAnalysis(analysisId: string): Promise<Note[]> {
    const snapshot = await this.notes(analysisId).orderBy("createdAt", "asc").get();
    return snapshot.docs.map((doc) => doc.data());
  }

  async delete(analysisId: string, noteId: string): Promise<void> {
    await this.notes(analysisId).doc(noteId).delete();
  }
}
