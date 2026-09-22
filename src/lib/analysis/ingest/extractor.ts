import type { Locator } from "@/lib/schema/evidence";

/**
 * One raw unit of text extracted from a source document, before T-2.06's
 * chunking, hashing and sanitisation turn it into `Evidence` records.
 * R-ARC-08: third-party parsers sit behind this interface, so swapping a
 * library only touches its own extractor file.
 */
export interface ExtractedPage {
  locator: Locator;
  text: string;
  /**
   * AI_SPEC section 3.1: true when the page has too little extractable
   * text and needs the vision fallback (sending the page image to the
   * model for transcription). Detected here; the actual render-and-send
   * happens once the LLM client exists (T-2.07/T-2.08) — nothing calls it
   * yet, so this extractor only flags the page, it doesn't render one.
   */
  needsVision: boolean;
}

export interface Extractor {
  extract(buffer: Buffer): Promise<ExtractedPage[]>;
}
