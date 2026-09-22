import { describe, expect, it } from "vitest";

import { isPathAllowed, parseRobotsTxt } from "@/lib/analysis/ingest/robots";

describe("parseRobotsTxt + isPathAllowed", () => {
  it("allows everything when there is no matching group", () => {
    const rules = parseRobotsTxt("User-agent: Googlebot\nDisallow: /\n", "ArgusAI-Bot");
    expect(isPathAllowed(rules, "/anything")).toBe(true);
  });

  it("applies the wildcard group when our bot isn't named specifically", () => {
    const rules = parseRobotsTxt("User-agent: *\nDisallow: /admin\n", "ArgusAI-Bot");
    expect(isPathAllowed(rules, "/admin/users")).toBe(false);
    expect(isPathAllowed(rules, "/about")).toBe(true);
  });

  it("prefers a group naming our bot over the wildcard group", () => {
    const text = ["User-agent: *", "Disallow: /", "", "User-agent: ArgusAI-Bot", "Allow: /"].join(
      "\n",
    );
    const rules = parseRobotsTxt(text, "ArgusAI-Bot");
    expect(isPathAllowed(rules, "/about")).toBe(true);
  });

  it("longest matching prefix wins", () => {
    const text = "User-agent: *\nDisallow: /blog\nAllow: /blog/public\n";
    const rules = parseRobotsTxt(text, "ArgusAI-Bot");
    expect(isPathAllowed(rules, "/blog/private")).toBe(false);
    expect(isPathAllowed(rules, "/blog/public/post-1")).toBe(true);
  });

  it("Allow wins a length tie", () => {
    const text = "User-agent: *\nDisallow: /x\nAllow: /x\n";
    const rules = parseRobotsTxt(text, "ArgusAI-Bot");
    expect(isPathAllowed(rules, "/x")).toBe(true);
  });

  it("an empty Disallow value restricts nothing", () => {
    const rules = parseRobotsTxt("User-agent: *\nDisallow:\n", "ArgusAI-Bot");
    expect(isPathAllowed(rules, "/anything")).toBe(true);
  });

  it("ignores comments and Crawl-delay/Sitemap directives", () => {
    const text = [
      "# comment",
      "User-agent: *",
      "Crawl-delay: 10",
      "Sitemap: https://example.com/sitemap.xml",
      "Disallow: /private",
    ].join("\n");
    const rules = parseRobotsTxt(text, "ArgusAI-Bot");
    expect(isPathAllowed(rules, "/private")).toBe(false);
    expect(isPathAllowed(rules, "/public")).toBe(true);
  });
});
