import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ReliabilityChip } from "@/components/argus/reliability-chip";
import type { Reliability } from "@/lib/schema/enums";

describe("ReliabilityChip", () => {
  it.each<[Reliability, string]>([
    ["INDEPENDENT", "Independent"],
    ["FIRST_PARTY", "Company"],
    ["PROVIDED", "Provided"],
  ])("labels %s as %s", (reliability, expectedText) => {
    render(<ReliabilityChip reliability={reliability} />);
    expect(screen.getByText(expectedText)).toBeInTheDocument();
  });
});
