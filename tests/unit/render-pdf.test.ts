import { beforeEach, describe, expect, it, vi } from "vitest";

const launch = vi.fn();
const addCookies = vi.fn();
const goto = vi.fn();
const pdf = vi.fn();
const close = vi.fn();
const newPage = vi.fn();
const newContext = vi.fn();

vi.mock("playwright-core", () => ({
  chromium: { launch: (...args: unknown[]) => launch(...args) },
}));

vi.mock("@/lib/env", () => ({
  env: {
    NODE_ENV: "test",
    APP_URL: "http://localhost:3000",
    SESSION_COOKIE_NAME: "argus_session",
    LOG_LEVEL: "silent",
  },
}));

const { renderReportPdf } = await import("@/lib/export/render-pdf");

describe("renderReportPdf", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    pdf.mockResolvedValue(Buffer.from("%PDF-fake"));
    newPage.mockResolvedValue({ goto, pdf });
    newContext.mockResolvedValue({ addCookies, newPage });
    launch.mockResolvedValue({ newContext, close });
  });

  it("launches Chromium, sets the caller's session cookie, navigates to the print page with the right reportId, and returns the PDF bytes", async () => {
    const result = await renderReportPdf({
      analysisId: "ana_1",
      reportId: "rpt_1",
      sessionCookieValue: "cookie-value",
    });

    expect(launch).toHaveBeenCalledTimes(1);
    expect(addCookies).toHaveBeenCalledWith([
      expect.objectContaining({ name: "argus_session", value: "cookie-value" }),
    ]);
    expect(goto).toHaveBeenCalledWith(
      "http://localhost:3000/print/report/ana_1?reportId=rpt_1",
      expect.objectContaining({ waitUntil: "networkidle" }),
    );
    expect(pdf).toHaveBeenCalledTimes(1);
    expect(result.toString()).toBe("%PDF-fake");
    expect(close).toHaveBeenCalledTimes(1);
  });

  it("closes the browser even if rendering throws", async () => {
    goto.mockRejectedValue(new Error("navigation failed"));

    await expect(
      renderReportPdf({ analysisId: "ana_1", reportId: "rpt_1", sessionCookieValue: "cookie-value" }),
    ).rejects.toThrow("navigation failed");
    expect(close).toHaveBeenCalledTimes(1);
  });
});
