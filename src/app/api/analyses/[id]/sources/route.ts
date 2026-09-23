import { NextResponse } from "next/server";
import { z } from "zod";

import {
  FileSignatureError,
  MAX_DECOMPRESSED_MULTIPLIER,
  sniffFileKind,
} from "@/lib/analysis/ingest/file-signature";
import { ingestSource } from "@/lib/analysis/ingest/ingest-source";
import { PdfPageLimitExceededError } from "@/lib/analysis/ingest/pdf-extractor";
import { assertOwns, requireUser } from "@/lib/api/auth";
import { handleApiError, NotFoundError, ValidationError } from "@/lib/api/errors";
import { assertSameOrigin } from "@/lib/api/origin";
import { env } from "@/lib/env";
import { getAdminStorageBucket } from "@/lib/firebase/admin";
import { getAdminFirestore } from "@/lib/repos/admin-firestore";
import { AnalysisRepo } from "@/lib/repos/analysis-repo";
import { SourceRepo } from "@/lib/repos/source-repo";
import { SourceType } from "@/lib/schema/enums";
import type { Evidence, Source } from "@/lib/schema/evidence";
import { newId } from "@/lib/schema/ids";

interface RouteContext {
  params: Promise<{ id: string }>;
}

const MIME_TYPES: Record<string, string> = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  text: "text/plain",
};

const RegisterUploadBody = z.object({
  type: SourceType,
  filename: z.string().min(1).max(255),
  storagePath: z.string().min(1),
});

function failedSource(
  id: string,
  analysisId: string,
  body: z.infer<typeof RegisterUploadBody>,
  sizeBytes: number,
  error: { code: string; message: string },
  now: string,
): Source {
  return {
    id,
    analysisId,
    type: body.type,
    origin: "UPLOAD",
    title: body.filename,
    filename: body.filename,
    storagePath: body.storagePath,
    sizeBytes,
    status: "FAILED",
    reliability: "PROVIDED",
    error,
    addedAt: now,
  };
}

/**
 * FR-INT-02/FR-INT-05, R-SEC-05: fetches the already direct-to-Storage
 * uploaded object, validates it by content (never the client-declared
 * mimeType), and — per APP_FLOW 5.3's "the server then validates and
 * registers each file" — runs the real INGEST extraction now rather than
 * deferring it to the eventual run, so the wizard can show a per-file
 * Parsed/Failed status immediately (APP_FLOW's "Wizard sources" state
 * catalogue). T-3.08's run orchestrator treats an already-`PARSED` source
 * as done (R-ARC-03 idempotency) instead of re-extracting it.
 */
export async function POST(request: Request, { params }: RouteContext): Promise<NextResponse> {
  try {
    assertSameOrigin(request);
    const { id: analysisId } = await params;
    const user = await requireUser();

    const analysis = await new AnalysisRepo(getAdminFirestore()).get(analysisId);
    if (!analysis) throw new NotFoundError("Analysis not found.");
    assertOwns(analysis.ownerId, user);

    const body = RegisterUploadBody.parse(await request.json());

    const expectedPrefix = `uploads/${user.uid}/${analysisId}/`;
    if (!body.storagePath.startsWith(expectedPrefix)) {
      throw new ValidationError("storagePath does not belong to this analysis.");
    }

    const file = getAdminStorageBucket().file(body.storagePath);
    const [exists] = await file.exists();
    if (!exists) throw new NotFoundError("Uploaded file not found. Try uploading it again.");

    const [buffer] = await file.download();
    const maxUploadBytes = env.MAX_UPLOAD_MB * 1024 * 1024;
    const sourceId = newId("src");
    const now = new Date().toISOString();

    let source: Source;
    let evidence: Evidence[] = [];

    if (buffer.length > maxUploadBytes) {
      source = failedSource(
        sourceId,
        analysisId,
        body,
        buffer.length,
        {
          code: "FILE_TOO_LARGE",
          message: `"${body.filename}" is larger than the ${env.MAX_UPLOAD_MB} MB limit.`,
        },
        now,
      );
    } else {
      try {
        const kind = sniffFileKind(body.filename, buffer, {
          maxDecompressedBytes: maxUploadBytes * MAX_DECOMPRESSED_MULTIPLIER,
        });

        const result = await ingestSource(analysisId, {
          id: sourceId,
          type: body.type,
          origin: "UPLOAD",
          title: body.filename,
          file: { filename: body.filename, buffer },
          maxPdfPages: env.MAX_PDF_PAGES,
        });

        source = {
          ...result.source,
          storagePath: body.storagePath,
          mimeType: MIME_TYPES[kind],
          sizeBytes: buffer.length,
        };
        evidence = result.evidence;
      } catch (error) {
        const message =
          error instanceof FileSignatureError
            ? error.message
            : error instanceof PdfPageLimitExceededError
              ? `"${body.filename}" has too many pages (max ${env.MAX_PDF_PAGES}).`
              : // APP_FLOW 5.3's own microcopy for an unreadable file.
                "This file could not be read. It may be password-protected or damaged. Upload an unlocked copy.";
        source = failedSource(
          sourceId,
          analysisId,
          body,
          buffer.length,
          {
            code: error instanceof FileSignatureError ? "INVALID_FILE" : "PARSE_FAILED",
            message,
          },
          now,
        );
      }
    }

    await new SourceRepo(getAdminFirestore()).create(source, evidence);
    return NextResponse.json({ source }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

/** Lists an analysis's registered sources — needed so the setup wizard can resume with sources already added (not in TRD's original API table; see PROJECT_MEMORY D-061). */
export async function GET(_request: Request, { params }: RouteContext): Promise<NextResponse> {
  try {
    const { id: analysisId } = await params;
    const user = await requireUser();

    const analysis = await new AnalysisRepo(getAdminFirestore()).get(analysisId);
    if (!analysis) throw new NotFoundError("Analysis not found.");
    assertOwns(analysis.ownerId, user);

    const sources = await new SourceRepo(getAdminFirestore()).list(analysisId);
    return NextResponse.json({ sources });
  } catch (error) {
    return handleApiError(error);
  }
}
