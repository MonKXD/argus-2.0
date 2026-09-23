import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";

import { proxy } from "@/proxy";

function request(path: string, cookie?: string): NextRequest {
  return new NextRequest(`http://localhost:3000${path}`, {
    headers: cookie ? { cookie } : undefined,
  });
}

describe("proxy (Next.js 16's renamed middleware)", () => {
  it("redirects an unauthenticated request for a protected route to /login with a redirect target", () => {
    const response = proxy(request("/app/analyses"));
    expect(response.headers.get("location")).toBe(
      "http://localhost:3000/login?redirect=%2Fapp%2Fanalyses",
    );
  });

  it("lets an authenticated request through to a protected route", () => {
    const response = proxy(request("/app", "argus_session=signed"));
    expect(response.headers.get("location")).toBeNull();
  });

  it("redirects an authenticated request away from /login to /app", () => {
    const response = proxy(request("/login", "argus_session=signed"));
    expect(response.headers.get("location")).toBe("http://localhost:3000/app");
  });

  it("redirects an authenticated request away from /signup to /app", () => {
    const response = proxy(request("/signup", "argus_session=signed"));
    expect(response.headers.get("location")).toBe("http://localhost:3000/app");
  });

  it("lets an unauthenticated request through to /login", () => {
    const response = proxy(request("/login"));
    expect(response.headers.get("location")).toBeNull();
  });
});
