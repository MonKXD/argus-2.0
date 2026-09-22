/**
 * TRD 5.1's `ResearchProvider` interface (shape, not final signature). One
 * raw hit from a web search, and one fetched page's readable text — both
 * before AI_SPEC 3.3's caller turns them into `Source`/`Evidence` records.
 * R-ARC-08: third-party providers sit behind this interface.
 */
export interface ResearchHit {
  url: string;
  title: string;
  pageAge?: string;
}

export interface FetchedPage {
  url: string;
  text: string;
  contentType: string;
}

export interface ResearchProvider {
  search(query: string, opts?: { maxResults?: number }): Promise<ResearchHit[]>;
  fetchPage(url: string): Promise<FetchedPage>;
}
