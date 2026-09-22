/**
 * Minimal robots.txt parser and path checker (TRD section 9: "Respect
 * robots.txt. Identify with a descriptive user agent."). Understands
 * `User-agent`, `Allow` and `Disallow` only — `Crawl-delay`/`Sitemap` are
 * ignored (not relevant to an 8-page-max crawl), and there's no `*`
 * wildcard or `$` end-anchor support within a path (Google-specific
 * extensions beyond the base spec) — plain prefix matching only.
 */

interface RobotsGroup {
  agents: string[];
  rules: Array<{ type: "allow" | "disallow"; path: string }>;
}

export interface RobotsRules {
  disallowedPaths: string[];
  allowedPaths: string[];
}

function parseGroups(text: string): RobotsGroup[] {
  const groups: RobotsGroup[] = [];
  let current: RobotsGroup | null = null;
  let collectingAgents = false;

  for (const rawLine of text.split(/\r\n|\r|\n/)) {
    const line = rawLine.split("#")[0]!.trim();
    if (!line) continue;

    const colonIndex = line.indexOf(":");
    if (colonIndex === -1) continue;
    const field = line.slice(0, colonIndex).trim().toLowerCase();
    const value = line.slice(colonIndex + 1).trim();

    if (field === "user-agent") {
      if (!collectingAgents || !current) {
        current = { agents: [], rules: [] };
        groups.push(current);
      }
      current.agents.push(value.toLowerCase());
      collectingAgents = true;
      continue;
    }

    if (!current) continue;
    collectingAgents = false;

    if (field === "allow") current.rules.push({ type: "allow", path: value });
    else if (field === "disallow") current.rules.push({ type: "disallow", path: value });
  }

  return groups;
}

/** Picks the most specific matching group (our own name beats `*`), per the group's own rules. */
export function parseRobotsTxt(text: string, botName: string): RobotsRules {
  const groups = parseGroups(text);
  const nameLower = botName.toLowerCase();

  const specific = groups.find((g) => g.agents.some((a) => a !== "*" && nameLower.includes(a)));
  const wildcard = groups.find((g) => g.agents.includes("*"));
  const chosen = specific ?? wildcard;

  if (!chosen) return { disallowedPaths: [], allowedPaths: [] };

  return {
    disallowedPaths: chosen.rules.filter((r) => r.type === "disallow").map((r) => r.path),
    allowedPaths: chosen.rules.filter((r) => r.type === "allow").map((r) => r.path),
  };
}

/** Longest matching path prefix wins; Allow wins a tie (RFC 9309's group-member algorithm). */
export function isPathAllowed(rules: RobotsRules, path: string): boolean {
  const candidates: Array<{ type: "allow" | "disallow"; path: string }> = [
    ...rules.disallowedPaths.map((p) => ({ type: "disallow" as const, path: p })),
    ...rules.allowedPaths.map((p) => ({ type: "allow" as const, path: p })),
  ];

  let bestType: "allow" | "disallow" | null = null;
  let bestLength = -1;

  for (const candidate of candidates) {
    let rulePath = candidate.path;
    if (rulePath === "") {
      if (candidate.type === "disallow") continue; // an empty Disallow restricts nothing
      rulePath = "/";
    }
    if (!path.startsWith(rulePath)) continue;
    if (
      rulePath.length > bestLength ||
      (rulePath.length === bestLength && candidate.type === "allow")
    ) {
      bestType = candidate.type;
      bestLength = rulePath.length;
    }
  }

  return bestType === null || bestType === "allow";
}
