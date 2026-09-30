import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { FlagAcknowledgeControls } from "@/components/argus/flag-acknowledge-controls";
import type { Flag } from "@/lib/schema/claims";

const refresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh }),
}));

const openFlag: Flag = {
  id: "flg_00000000000000000000000001",
  category: "FOUNDER",
  severity: "MEDIUM",
  title: "ARR is founder-stated only",
  description: "The $2.0M ARR figure appears only in the pitch deck.",
  evidenceIds: [],
  claimIds: [],
  detectedBy: "DIMENSION",
  status: "OPEN",
};

describe("FlagAcknowledgeControls", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows Acknowledge and Dismiss actions for an open flag", () => {
    render(<FlagAcknowledgeControls analysisId="ana_1" reportId="rpt_1" flag={openFlag} />);

    expect(screen.getByRole("button", { name: "Acknowledge" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Dismiss" })).toBeInTheDocument();
  });

  it("shows only a status label, no actions, for an already-resolved flag", () => {
    render(
      <FlagAcknowledgeControls
        analysisId="ana_1"
        reportId="rpt_1"
        flag={{ ...openFlag, status: "ACKNOWLEDGED" }}
      />,
    );

    expect(screen.getByText("Acknowledged")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Acknowledge" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Dismiss" })).not.toBeInTheDocument();
  });

  it("acknowledges a flag on click", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ flag: {} }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    render(<FlagAcknowledgeControls analysisId="ana_1" reportId="rpt_1" flag={openFlag} />);

    await user.click(screen.getByRole("button", { name: "Acknowledge" }));

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/analyses/ana_1/reports/rpt_1/flags/flg_00000000000000000000000001",
      expect.objectContaining({ body: JSON.stringify({ status: "ACKNOWLEDGED" }) }),
    );
    expect(refresh).toHaveBeenCalledOnce();
  });
});
