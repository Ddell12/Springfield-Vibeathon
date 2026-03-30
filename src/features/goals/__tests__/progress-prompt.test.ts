import { describe, expect, it } from "vitest";

import { buildReportPrompt, parseReportResponse } from "../lib/progress-prompt";

describe("buildReportPrompt", () => {
  it("includes patient context", () => {
    const prompt = buildReportPrompt(
      { firstName: "Alex", lastName: "Smith", diagnosis: "articulation" },
      [],
      "weekly-summary",
      "2026-03-21",
      "2026-03-28",
    );
    expect(prompt).toContain("Alex Smith");
    expect(prompt).toContain("articulation");
  });

  it("includes goal data", () => {
    const prompt = buildReportPrompt(
      { firstName: "Alex", lastName: "Smith", diagnosis: "articulation" },
      [{
        goalId: "g1",
        shortDescription: "Produce /r/",
        domain: "articulation",
        fullGoalText: "Test goal",
        targetAccuracy: 80,
        status: "active",
        dataPoints: [{ date: "2026-03-28", accuracy: 75 }],
        trend: "improving",
        streak: 1,
        averageAccuracy: 75,
      }],
      "iep-progress-report",
      "2026-03-01",
      "2026-03-28",
    );
    expect(prompt).toContain("Produce /r/");
    expect(prompt).toContain("IEP progress report");
  });

  it("includes previous narrative when provided", () => {
    const prompt = buildReportPrompt(
      { firstName: "Alex", lastName: "Smith", diagnosis: "articulation" },
      [],
      "weekly-summary",
      "2026-03-21",
      "2026-03-28",
      "Last week was great.",
    );
    expect(prompt).toContain("Last week was great.");
  });
});

describe("parseReportResponse", () => {
  it("parses valid JSON response", () => {
    const response = '```json\n{"goalSummaries": [{"goalId": "g1", "narrative": "Good progress."}], "overallNarrative": "Overall good."}\n```';
    const parsed = parseReportResponse(response);
    expect(parsed).not.toBeNull();
    expect(parsed!.goalSummaries).toHaveLength(1);
    expect(parsed!.overallNarrative).toBe("Overall good.");
  });

  it("returns null for invalid response", () => {
    expect(parseReportResponse("not json")).toBeNull();
  });
});
