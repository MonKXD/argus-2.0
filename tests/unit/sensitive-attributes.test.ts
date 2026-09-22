import { describe, expect, it } from "vitest";

import { sensitiveAttributeMatches } from "@/lib/analysis/verify/sensitive-attributes";

describe("sensitiveAttributeMatches: catches genuine protected-attribute statements", () => {
  it.each([
    ["The founder is Black and grew up in Chicago.", "race_ethnicity"],
    ["She was diagnosed with a chronic illness last year.", "health"],
    ["He is a devout Christian who prays daily.", "religion"],
    ["The CEO is gay and married to his husband.", "orientation_gender"],
    ["She is 62 years old and has decades of experience.", "age"],
    ["He is a registered Republican and donates to the party.", "political"],
    ["The founder immigrated from Vietnam as a child.", "national_origin"],
    ["The co-founder is having an affair with an investor.", "private_life"],
  ])("flags: %s", (text, expectedCategory) => {
    const hits = sensitiveAttributeMatches(text);
    expect(hits.map((h) => h.category)).toContain(expectedCategory);
  });
});

describe("sensitiveAttributeMatches: never flags ordinary business language", () => {
  it.each([
    "The company is expanding into Asian markets this quarter.",
    "Loopwell raised a single round of funding led by a family office.",
    "The product has highly engaged users across all cohorts.",
    "The team took a liberal approach to experimentation.",
    "The African fintech market grew 40% year over year.",
    "Average revenue per user increased by 20%.",
    "The company's stage is Series A with strong momentum.",
    "ARR reached $2.0M in Q2 2026, up from $1.2M the prior year.",
    "The founder has a decade of engineering experience.",
  ])("does not flag: %s", (text) => {
    expect(sensitiveAttributeMatches(text)).toEqual([]);
  });
});
