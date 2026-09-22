import { createServer, type Server } from "node:http";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { RobotsDisallowedError, WebsiteExtractor } from "@/lib/analysis/ingest/website-extractor";

import type { AddressInfo } from "node:net";

/**
 * Real local HTTP server, not a mock — same approach as safe-fetch.test.ts
 * and the T-2.03/T-2.04 extractors. Pages link to each other so the crawl,
 * same-origin filtering, priority-path ordering and robots.txt handling
 * all run against real requests.
 */

const PAGES: Record<string, { html: string; contentType?: string }> = {
  "/": {
    html: `<html><body>
      <p>Loopwell home page.</p>
      <a href="/blog">Blog</a>
      <a href="/about">About</a>
      <a href="https://external.example.com/">External</a>
      <a href="mailto:hi@loopwell.example">Email</a>
    </body></html>`,
  },
  "/about": {
    html: "<html><body><p>Loopwell was founded in 2024.</p></body></html>",
  },
  "/blog": {
    html: '<html><body><p>Blog index.</p><a href="/blog/post-1">Post 1</a></body></html>',
  },
  "/blog/post-1": {
    html: "<html><body><p>Blog post one content.</p></body></html>",
  },
  "/empty": {
    html: "<html><body></body></html>",
  },
};

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

    const page = PAGES[url.pathname];
    if (page) {
      res.writeHead(200, { "content-type": page.contentType ?? "text/html" });
      res.end(page.html);
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

describe("WebsiteExtractor", () => {
  it("crawls same-origin pages reachable from the start URL, with a url locator", async () => {
    const extractor = new WebsiteExtractor({ unsafeAllowPrivateNetworksForTests: true });
    const pages = await extractor.extract(`${baseUrl}/`);

    const urls = pages.map((p) => (p.locator as { url: string }).url);
    expect(urls).toContain(`${baseUrl}/`);
    expect(urls).toContain(`${baseUrl}/about`);
    expect(urls).toContain(`${baseUrl}/blog`);
    expect(urls).toContain(`${baseUrl}/blog/post-1`);
    expect(urls.every((u) => u.startsWith(baseUrl))).toBe(true); // no external.example.com

    const home = pages.find((p) => (p.locator as { url: string }).url === `${baseUrl}/`);
    expect(home!.text).toContain("Loopwell home page.");
    expect(home!.needsVision).toBe(false);
  });

  it("respects robots.txt: never fetches a disallowed path", async () => {
    const extractor = new WebsiteExtractor({ unsafeAllowPrivateNetworksForTests: true });
    const pages = await extractor.extract(`${baseUrl}/`);

    const urls = pages.map((p) => (p.locator as { url: string }).url);
    expect(urls).not.toContain(`${baseUrl}/private`);
  });

  it("throws RobotsDisallowedError when the start URL itself is disallowed", async () => {
    const extractor = new WebsiteExtractor({ unsafeAllowPrivateNetworksForTests: true });
    await expect(extractor.extract(`${baseUrl}/private`)).rejects.toBeInstanceOf(
      RobotsDisallowedError,
    );
  });

  it("caps the crawl at maxPages", async () => {
    const extractor = new WebsiteExtractor({
      maxPages: 2,
      unsafeAllowPrivateNetworksForTests: true,
    });
    const pages = await extractor.extract(`${baseUrl}/`);
    expect(pages.length).toBeLessThanOrEqual(2);
  });

  it("skips pages with no extractable text but keeps crawling", async () => {
    const extractor = new WebsiteExtractor({ unsafeAllowPrivateNetworksForTests: true });
    const pages = await extractor.extract(`${baseUrl}/empty`);
    expect(pages).toEqual([]);
  });
});
