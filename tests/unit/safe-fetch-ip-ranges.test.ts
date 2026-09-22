import { describe, expect, it } from "vitest";

import { isBlockedIp } from "@/lib/analysis/ingest/safe-fetch";

// R-TST-01: the SSRF guard is unit-tested. This covers the pure
// isBlockedIp() range-check directly — no network involved — against
// every range TRD section 9 calls out, plus the IPv4-mapped/NAT64 IPv6
// forms that embed a blocked (or allowed) IPv4 address.

describe("isBlockedIp: IPv4", () => {
  it.each([
    ["0.0.0.0", true],
    ["10.0.0.1", true],
    ["10.255.255.255", true],
    ["100.64.0.1", true],
    ["127.0.0.1", true],
    ["169.254.169.254", true], // cloud metadata endpoint
    ["172.16.0.1", true],
    ["172.31.255.255", true],
    ["192.168.1.1", true],
    ["192.0.2.1", true],
    ["198.51.100.1", true],
    ["203.0.113.1", true],
    ["224.0.0.1", true],
    ["240.0.0.1", true],
    ["255.255.255.255", true],
  ])("blocks %s", (ip, expected) => {
    expect(isBlockedIp(ip)).toBe(expected);
  });

  it.each([
    ["8.8.8.8", false],
    ["1.1.1.1", false],
    ["172.15.255.255", false], // just outside 172.16.0.0/12
    ["172.32.0.0", false], // just outside 172.16.0.0/12
    ["9.255.255.255", false], // just outside 10.0.0.0/8
    ["11.0.0.0", false], // just outside 10.0.0.0/8
  ])("allows %s", (ip, expected) => {
    expect(isBlockedIp(ip)).toBe(expected);
  });
});

describe("isBlockedIp: IPv6", () => {
  it.each([
    ["::1", true], // loopback
    ["::", true], // unspecified
    ["fe80::1", true], // link-local
    ["fc00::1", true], // unique local
    ["fd12:3456:789a::1", true], // unique local
    ["ff02::1", true], // multicast
  ])("blocks %s", (ip, expected) => {
    expect(isBlockedIp(ip)).toBe(expected);
  });

  it.each([
    ["2606:4700:4700::1111", false], // Cloudflare DNS, public
    ["2001:4860:4860::8888", false], // Google DNS, public
  ])("allows %s", (ip, expected) => {
    expect(isBlockedIp(ip)).toBe(expected);
  });
});

describe("isBlockedIp: IPv4-mapped and NAT64 IPv6 forms", () => {
  it("blocks an IPv4-mapped address embedding a blocked IPv4 address", () => {
    expect(isBlockedIp("::ffff:169.254.169.254")).toBe(true);
    expect(isBlockedIp("::ffff:127.0.0.1")).toBe(true);
  });

  it("allows an IPv4-mapped address embedding a public IPv4 address", () => {
    expect(isBlockedIp("::ffff:8.8.8.8")).toBe(false);
  });

  it("blocks a NAT64 address embedding a blocked IPv4 address", () => {
    expect(isBlockedIp("64:ff9b::a9fe:a9fe")).toBe(true); // 169.254.169.254 in hex
  });

  it("allows a NAT64 address embedding a public IPv4 address", () => {
    expect(isBlockedIp("64:ff9b::808:808")).toBe(false); // 8.8.8.8 in hex
  });
});
