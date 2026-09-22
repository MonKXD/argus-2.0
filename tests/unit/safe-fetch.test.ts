import { createServer, type Server } from "node:http";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { safeFetch, SsrfError } from "@/lib/analysis/ingest/safe-fetch";

import type { AddressInfo } from "node:net";

/**
 * Full-path tests against a real local HTTP server, not a mock — same
 * "real bytes/real behaviour" approach as the other T-2.0x extractors.
 * `unsafeAllowPrivateNetworksForTests` is what lets these hit 127.0.0.1 at
 * all; the "blocks private networks by default" tests below call
 * safeFetch() without it, so they exercise the real production guard.
 */

let server: Server;
let baseUrl: string;
let redirectCount = 0;

beforeAll(async () => {
  server = createServer((req, res) => {
    const url = new URL(req.url ?? "/", "http://localhost");

    if (url.pathname === "/html") {
      res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      res.end("<html><body><p>Loopwell pitch deck</p></body></html>");
      return;
    }
    if (url.pathname === "/text") {
      res.writeHead(200, { "content-type": "text/plain" });
      res.end("Loopwell pitch deck");
      return;
    }
    if (url.pathname === "/redirect-once") {
      res.writeHead(302, { location: "/html" });
      res.end();
      return;
    }
    if (url.pathname === "/redirect-loop") {
      redirectCount++;
      res.writeHead(302, { location: `/redirect-loop?n=${redirectCount}` });
      res.end();
      return;
    }
    if (url.pathname === "/big") {
      res.writeHead(200, { "content-type": "text/plain" });
      res.end("x".repeat(3 * 1024 * 1024));
      return;
    }
    if (url.pathname === "/bad-type") {
      res.writeHead(200, { "content-type": "application/json" });
      res.end("{}");
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

describe("safeFetch: happy path (against a local server, bypass flag on)", () => {
  it("fetches HTML content", async () => {
    const result = await safeFetch(`${baseUrl}/html`, {
      unsafeAllowPrivateNetworksForTests: true,
    });
    expect(result.contentType).toBe("text/html");
    expect(result.body).toContain("Loopwell pitch deck");
    expect(result.finalUrl).toBe(`${baseUrl}/html`);
  });

  it("fetches plain text content", async () => {
    const result = await safeFetch(`${baseUrl}/text`, {
      unsafeAllowPrivateNetworksForTests: true,
    });
    expect(result.contentType).toBe("text/plain");
    expect(result.body).toBe("Loopwell pitch deck");
  });

  it("follows a redirect and re-validates the target", async () => {
    const result = await safeFetch(`${baseUrl}/redirect-once`, {
      unsafeAllowPrivateNetworksForTests: true,
    });
    expect(result.finalUrl).toBe(`${baseUrl}/html`);
    expect(result.body).toContain("Loopwell pitch deck");
  });

  it("rejects more than 3 redirects", async () => {
    await expect(
      safeFetch(`${baseUrl}/redirect-loop`, { unsafeAllowPrivateNetworksForTests: true }),
    ).rejects.toBeInstanceOf(SsrfError);
  });

  it("rejects a response over the 2 MB body cap", async () => {
    await expect(
      safeFetch(`${baseUrl}/big`, { unsafeAllowPrivateNetworksForTests: true }),
    ).rejects.toBeInstanceOf(SsrfError);
  });

  it("rejects an unsupported content type", async () => {
    await expect(
      safeFetch(`${baseUrl}/bad-type`, { unsafeAllowPrivateNetworksForTests: true }),
    ).rejects.toBeInstanceOf(SsrfError);
  });
});

describe("safeFetch: blocks private/loopback networks by default", () => {
  it("rejects a loopback target with no bypass flag", async () => {
    await expect(safeFetch(`${baseUrl}/html`)).rejects.toBeInstanceOf(SsrfError);
  });

  it("rejects a non-http(s) protocol", async () => {
    await expect(safeFetch("file:///etc/passwd")).rejects.toBeInstanceOf(SsrfError);
  });

  it("rejects a disallowed port even on an otherwise-public-looking host", async () => {
    await expect(safeFetch("http://example.com:8080/")).rejects.toBeInstanceOf(SsrfError);
  });
});
