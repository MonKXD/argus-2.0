import { lookup as dnsLookup } from "node:dns/promises";
import * as http from "node:http";
import * as https from "node:https";
import * as net from "node:net";

import type { LookupFunction } from "node:net";

/**
 * SSRF-safe fetcher (R-SEC-06, TRD section 9's "Website ingestion
 * (SSRF-safe)"): http/https on ports 80/443 only, loopback/private/
 * link-local/metadata ranges blocked (IPv4 and IPv6, including
 * IPv4-mapped and NAT64 IPv6 forms of a blocked address), re-validated on
 * every redirect, 10s timeout, 2 MB body cap, HTML or plain text only.
 *
 * DNS-rebinding note: resolving the hostname and then letting the HTTP
 * client do its own separate DNS lookup would let an attacker's DNS
 * answer differently between the check and the connect. Instead this
 * resolves and validates the address itself, then pins the request's
 * `lookup` option to that exact validated address, so the TCP connection
 * can only go where it was checked.
 */

const USER_AGENT = "ArgusAI-Bot/1.0 (+https://argus.ai/crawler)";
const MAX_REDIRECTS = 3;
const FETCH_TIMEOUT_MS = 10_000;
const MAX_BODY_BYTES = 2 * 1024 * 1024;
const ALLOWED_CONTENT_TYPES = ["text/html", "text/plain"];

export class SsrfError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SsrfError";
  }
}

export interface SafeFetchResult {
  body: string;
  contentType: string;
  finalUrl: string;
}

export interface SafeFetchOptions {
  /**
   * Test-only escape hatch so tests can point at a local server
   * (127.0.0.1) without the real guard rejecting it. Never set by
   * production callers — defaults to false, which is the real guard.
   */
  unsafeAllowPrivateNetworksForTests?: boolean;
}

// --- IP range checking ---------------------------------------------------

function ipv4ToInt(ip: string): number {
  const parts = ip.split(".").map(Number);
  return ((parts[0]! << 24) | (parts[1]! << 16) | (parts[2]! << 8) | parts[3]!) >>> 0;
}

function isIpv4InCidr(ip: string, cidr: string): boolean {
  const [range, bitsStr] = cidr.split("/");
  const bits = Number(bitsStr);
  const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
  return (ipv4ToInt(ip) & mask) === (ipv4ToInt(range!) & mask);
}

function ipv6ToBigInt(ip: string): bigint {
  let addr = ip;
  const ipv4Match = /(\d+\.\d+\.\d+\.\d+)$/.exec(addr);
  if (ipv4Match) {
    const embedded = ipv4Match[1]!;
    const hex = ipv4ToInt(embedded).toString(16).padStart(8, "0");
    addr = addr.slice(0, addr.length - embedded.length) + hex.slice(0, 4) + ":" + hex.slice(4);
  }

  const hasDouble = addr.includes("::");
  const [head, tail] = addr.split("::");
  const headParts = head ? head.split(":").filter(Boolean) : [];
  const tailParts = tail ? tail.split(":").filter(Boolean) : [];
  const parts = hasDouble
    ? [
        ...headParts,
        ...Array(Math.max(8 - headParts.length - tailParts.length, 0)).fill("0"),
        ...tailParts,
      ]
    : addr.split(":");

  let result = BigInt(0);
  for (const part of parts) {
    result = (result << BigInt(16)) | BigInt(parseInt(part || "0", 16));
  }
  return result;
}

/** IPv4 loopback, private, link-local/metadata, carrier-NAT, reserved and multicast ranges. */
const IPV4_BLOCKLIST = [
  "0.0.0.0/8",
  "10.0.0.0/8",
  "100.64.0.0/10",
  "127.0.0.0/8",
  "169.254.0.0/16", // includes the 169.254.169.254 cloud metadata address
  "172.16.0.0/12",
  "192.0.0.0/24",
  "192.0.2.0/24",
  "192.168.0.0/16",
  "198.18.0.0/15",
  "198.51.100.0/24",
  "203.0.113.0/24",
  "224.0.0.0/4",
  "240.0.0.0/4",
  "255.255.255.255/32",
];

const IPV6_BLOCKLIST: Array<{ prefix: bigint; bits: number }> = [
  { prefix: ipv6ToBigInt("::"), bits: 128 }, // unspecified
  { prefix: ipv6ToBigInt("::1"), bits: 128 }, // loopback
  { prefix: ipv6ToBigInt("fe80::"), bits: 10 }, // link-local (includes IMDSv2's fe80:: forms)
  { prefix: ipv6ToBigInt("fc00::"), bits: 7 }, // unique local
  { prefix: ipv6ToBigInt("ff00::"), bits: 8 }, // multicast
];

const NAT64_PREFIX96 = ipv6ToBigInt("64:ff9b::") >> BigInt(32);
const MAPPED_PREFIX96 = ipv6ToBigInt("::ffff:0:0") >> BigInt(32);

function ipv6InPrefix(value: bigint, prefix: bigint, bits: number): boolean {
  if (bits === 0) return true;
  const shift = BigInt(128 - bits);
  return value >> shift === prefix >> shift;
}

/** IPv4-mapped (`::ffff:a.b.c.d`) or NAT64 (`64:ff9b::a.b.c.d`) addresses embed a real IPv4
 * address in their low 32 bits — that embedded address needs checking too, not just the
 * IPv6 prefix, since e.g. `::ffff:8.8.8.8` is a legitimate public address. */
function extractEmbeddedIpv4(value: bigint): string | null {
  const prefix96 = value >> BigInt(32);
  if (prefix96 !== NAT64_PREFIX96 && prefix96 !== MAPPED_PREFIX96) return null;
  const int32 = Number(value & BigInt(0xffffffff)) >>> 0;
  return [24, 16, 8, 0].map((shift) => (int32 >>> shift) & 0xff).join(".");
}

export function isBlockedIp(ip: string): boolean {
  if (net.isIPv4(ip)) {
    return IPV4_BLOCKLIST.some((cidr) => isIpv4InCidr(ip, cidr));
  }
  if (net.isIPv6(ip)) {
    const value = ipv6ToBigInt(ip);
    if (IPV6_BLOCKLIST.some(({ prefix, bits }) => ipv6InPrefix(value, prefix, bits))) return true;
    const embedded = extractEmbeddedIpv4(value);
    return embedded !== null && isBlockedIp(embedded);
  }
  return true; // not a recognisable literal address — fail closed
}

function stripBrackets(hostname: string): string {
  return hostname.startsWith("[") && hostname.endsWith("]") ? hostname.slice(1, -1) : hostname;
}

// --- URL and host validation ---------------------------------------------

function assertAllowedProtocolAndPort(url: URL, allowPrivate: boolean): void {
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new SsrfError(`Protocol not allowed: ${url.protocol}`);
  }
  // Port 80/443 only in production; tests bind a local server to an
  // ephemeral port, so this check (like the private-IP block) is skipped
  // under the same test-only bypass.
  if (allowPrivate) return;
  const defaultPort = url.protocol === "https:" ? 443 : 80;
  const port = url.port ? Number(url.port) : defaultPort;
  if (port !== defaultPort) {
    throw new SsrfError(`Port not allowed: ${port}`);
  }
}

async function resolveAndValidateHost(hostname: string, allowPrivate: boolean): Promise<string> {
  const bare = stripBrackets(hostname);

  if (net.isIP(bare)) {
    if (!allowPrivate && isBlockedIp(bare)) {
      throw new SsrfError(`Blocked address: ${bare}`);
    }
    return bare;
  }

  const results = await dnsLookup(bare, { all: true, verbatim: true });
  if (results.length === 0) throw new SsrfError(`Could not resolve host: ${bare}`);

  if (!allowPrivate) {
    for (const { address } of results) {
      if (isBlockedIp(address)) {
        throw new SsrfError(`Host resolves to a blocked address: ${bare} -> ${address}`);
      }
    }
  }

  return results[0]!.address;
}

function pinnedLookup(pinnedIp: string): LookupFunction {
  return (_hostname, _options, callback) => {
    callback(null, pinnedIp, net.isIPv6(pinnedIp) ? 6 : 4);
  };
}

// --- request/response handling -------------------------------------------

function requestOnce(url: URL, pinnedIp: string): Promise<http.IncomingMessage> {
  return new Promise((resolve, reject) => {
    const client = url.protocol === "https:" ? https : http;
    const req = client.request(
      url,
      {
        method: "GET",
        headers: { "User-Agent": USER_AGENT, Accept: "text/html,text/plain" },
        lookup: pinnedLookup(pinnedIp),
        timeout: FETCH_TIMEOUT_MS,
      },
      resolve,
    );
    req.on("timeout", () => req.destroy(new SsrfError(`Timed out fetching ${url.toString()}`)));
    req.on("error", reject);
    req.end();
  });
}

function readBodyWithLimit(response: http.IncomingMessage, maxBytes: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let total = 0;

    response.on("data", (chunk: Buffer) => {
      total += chunk.length;
      if (total > maxBytes) {
        response.destroy();
        reject(new SsrfError(`Response exceeded ${maxBytes} bytes`));
        return;
      }
      chunks.push(chunk);
    });
    response.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")));
    response.on("error", reject);
  });
}

export async function safeFetch(
  inputUrl: string,
  options: SafeFetchOptions = {},
): Promise<SafeFetchResult> {
  const allowPrivate = options.unsafeAllowPrivateNetworksForTests ?? false;
  let currentUrl = new URL(inputUrl);

  for (let redirectCount = 0; ; redirectCount++) {
    assertAllowedProtocolAndPort(currentUrl, allowPrivate);
    const pinnedIp = await resolveAndValidateHost(currentUrl.hostname, allowPrivate);
    const response = await requestOnce(currentUrl, pinnedIp);

    const status = response.statusCode ?? 0;
    if (status >= 300 && status < 400 && response.headers.location) {
      response.destroy();
      if (redirectCount >= MAX_REDIRECTS) {
        throw new SsrfError(`Too many redirects fetching ${inputUrl}`);
      }
      currentUrl = new URL(response.headers.location, currentUrl);
      continue;
    }

    if (status < 200 || status >= 300) {
      response.destroy();
      throw new SsrfError(`Unexpected status ${status} fetching ${currentUrl.toString()}`);
    }

    const contentType = (response.headers["content-type"] ?? "")
      .split(";")[0]!
      .trim()
      .toLowerCase();
    if (!ALLOWED_CONTENT_TYPES.includes(contentType)) {
      response.destroy();
      throw new SsrfError(`Unsupported content type: ${contentType || "unknown"}`);
    }

    const body = await readBodyWithLimit(response, MAX_BODY_BYTES);
    return { body, contentType, finalUrl: currentUrl.toString() };
  }
}
