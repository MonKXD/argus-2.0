import { readFile } from "node:fs/promises";
import { createServer, type Server } from "node:http";

import type { AddressInfo } from "node:net";

export interface LocalHtmlServer {
  url: string;
  stop: () => Promise<void>;
}

/**
 * Serves one local HTML file over a throwaway `127.0.0.1` server, so a
 * `WEBSITE`-type fixture (F7) can exercise the real `WebsiteExtractor` /
 * `safeFetch` path without depending on a real external domain — same
 * "real bytes, real request, no mock" pattern as
 * `tests/unit/website-extractor.test.ts`.
 */
export async function serveLocalHtml(filePath: string): Promise<LocalHtmlServer> {
  const html = await readFile(filePath, "utf-8");
  const server: Server = createServer((_req, res) => {
    res.writeHead(200, { "content-type": "text/html" });
    res.end(html);
  });

  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as AddressInfo;

  return {
    url: `http://127.0.0.1:${port}/`,
    stop: () => new Promise<void>((resolve) => server.close(() => resolve())),
  };
}
