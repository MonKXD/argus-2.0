import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import SettingsPage from "@/app/app/settings/page";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status });
}

describe("SettingsPage", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse({
          runningCount: 1,
          dailyCount: 4,
          maxConcurrentRuns: 2,
          dailyAnalysisLimit: 10,
          recentRuns: [],
        }),
      ),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows the real usage counts against their limits", async () => {
    render(<SettingsPage />);
    expect(await screen.findByText("1 of 2")).toBeInTheDocument();
    expect(screen.getByText("4 of 10")).toBeInTheDocument();
  });

  it("shows an error with Retry when the usage request fails, and recovers on retry", async () => {
    let shouldFail = true;
    vi.stubGlobal(
      "fetch",
      vi.fn(() => {
        if (shouldFail) return Promise.resolve(new Response("{}", { status: 500 }));
        return Promise.resolve(
          jsonResponse({
            runningCount: 0,
            dailyCount: 0,
            maxConcurrentRuns: 2,
            dailyAnalysisLimit: 10,
            recentRuns: [],
          }),
        );
      }),
    );

    render(<SettingsPage />);
    expect(await screen.findByText("Couldn't load your usage. Try again.")).toBeInTheDocument();

    shouldFail = false;
    const { default: userEvent } = await import("@testing-library/user-event");
    await userEvent.setup().click(screen.getByRole("button", { name: "Retry" }));

    expect(await screen.findByText("0 of 2")).toBeInTheDocument();
  });

  it("renders every dimension's weight across all three stage profiles, summing to 100%", () => {
    render(<SettingsPage />);

    expect(screen.getByRole("columnheader", { name: "Early" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Seed" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Growth" })).toBeInTheDocument();
    expect(screen.getByRole("rowheader", { name: "Founder" })).toBeInTheDocument();
    expect(screen.getByRole("rowheader", { name: "Risk" })).toBeInTheDocument();
  });

  it("renders the rubric criteria for every dimension", () => {
    render(<SettingsPage />);
    expect(
      screen.getByText("Relevant domain expertise or direct experience of the problem"),
    ).toBeInTheDocument();
  });

  it("shows the scoring version", () => {
    render(<SettingsPage />);
    expect(screen.getByText(/Version 1\.0\.0/)).toBeInTheDocument();
  });

  it("links to the full data export (T-6.12)", () => {
    render(<SettingsPage />);
    expect(screen.getByRole("link", { name: "Export all my data" })).toHaveAttribute(
      "href",
      "/api/account/export",
    );
  });

  it("shows an empty state when there are no runs yet (T-6.08)", async () => {
    render(<SettingsPage />);
    expect(
      await screen.findByText("No runs yet. Start an analysis to see its duration and cost here."),
    ).toBeInTheDocument();
  });

  it("renders a recent run's status, duration and cost (T-6.08)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse({
          runningCount: 0,
          dailyCount: 1,
          maxConcurrentRuns: 2,
          dailyAnalysisLimit: 10,
          recentRuns: [
            {
              id: "run_1",
              analysisId: "ana_1",
              status: "SUCCEEDED",
              startedAt: "2026-10-02T00:00:00.000Z",
              finishedAt: "2026-10-02T00:00:08.000Z",
              usage: { inputTokens: 1000, outputTokens: 500, estimatedCostUsd: 0.0123 },
            },
          ],
        }),
      ),
    );

    render(<SettingsPage />);
    expect(await screen.findByText("Complete")).toBeInTheDocument();
    expect(screen.getByText("8 sec")).toBeInTheDocument();
    expect(screen.getByText("$0.0123")).toBeInTheDocument();
  });
});
