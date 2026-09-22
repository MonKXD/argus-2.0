import { createServer, type Server } from "node:http";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { RobotsDisallowedError } from "@/lib/analysis/ingest/website-extractor";
import { fetchResearchPage } from "@/lib/analysis/research/fetch-page";

import type { AddressInfo } from "node:net";

/** Real local HTTP server, not a mock — same approach as safe-fetch.test.ts/website-extractor.test.ts. */

let server: Server;
let baseUrl: string;

beforeAll(async () => {
  server = createServer((req, res) => {
    const url = new URL(req.url ?? "/", "http://localhost");

    if (url.pathname === "/robots.txt") {
      res.writeHead(200, { "content-type": "text/plain" });
      res.end("User-agent: *\nDisallow: /private\n");
      return;
    }
    if (url.pathname === "/private") {
      res.writeHead(200, { "content-type": "text/html" });
      res.end("<html><body><p>Should never be fetched.</p></body></html>");
      return;
    }
    if (url.pathname === "/article") {
      res.writeHead(200, { "content-type": "text/html" });
      res.end("<html><body><p>Loopwell raised a $5M seed round.</p></body></html>");
      return;
    }
    if (url.pathname === "/plain") {
      res.writeHead(200, { "content-type": "text/plain" });
      res.end("Plain text research note.");
      return;
    }

    res.writeHead(404);
    res.end();
  });

  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${port}`;
});

afterAll(() => {
  server.close();
});

describe("fetchResearchPage", () => {
  it("fetches an HTML page and converts it to readable text", async () => {
    const page = await fetchResearchPage(`${baseUrl}/article`, { unsafeAllowPrivateNetworksForTests: true });

    expect(page.url).toBe(`${baseUrl}/article`);
    expect(page.contentType).toBe("text/html");
    expect(page.text).toContain("Loopwell raised a $5M seed round.");
  });

  it("returns plain text bodies unchanged", async () => {
    const page = await fetchResearchPage(`${baseUrl}/plain`, { unsafeAllowPrivateNetworksForTests: true });

    expect(page.text).toBe("Plain text research note.");
  });

  it("respects robots.txt disallow rules", async () => {
    await expect(
      fetchResearchPage(`${baseUrl}/private`, { unsafeAllowPrivateNetworksForTests: true }),
    ).rejects.toThrow(RobotsDisallowedError);
  });
});
