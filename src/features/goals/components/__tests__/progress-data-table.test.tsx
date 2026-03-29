import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ProgressDataTable } from "../progress-data-table";

vi.mock("../../lib/goal-utils", () => ({
  promptLevelLabel: (level: string | undefined) => {
    switch (level) {
      case "independent": return "Independent";
      case "verbal-cue": return "Verbal Cue";
      case "model": return "Model";
      case "physical": return "Physical";
      default: return "Unknown";
    }
  },
}));

const sampleData = [
  {
    _id: "dp1",
    date: "2026-03-15",
    accuracy: 80,
    trials: 20,
    correct: 16,
    promptLevel: "independent",
    source: "session-note",
    notes: "Good session",
  },
  {
    _id: "dp2",
    date: "2026-03-14",
    accuracy: 65,
    trials: 10,
    correct: undefined,
    promptLevel: "verbal-cue",
    source: "manual-entry",
  },
  {
    _id: "dp3",
    date: "2026-03-13",
    accuracy: 90,
    source: "in-app-auto",
  },
];

describe("ProgressDataTable", () => {
  it("shows empty message when data is empty", () => {
    render(<ProgressDataTable data={[]} />);
    expect(screen.getByText("No data points recorded yet.")).toBeInTheDocument();
  });

  it("renders table headers", () => {
    render(<ProgressDataTable data={sampleData} />);
    expect(screen.getByText("Date")).toBeInTheDocument();
    expect(screen.getByText("Source")).toBeInTheDocument();
    expect(screen.getByText("Accuracy")).toBeInTheDocument();
    expect(screen.getByText("Trials")).toBeInTheDocument();
    expect(screen.getByText("Prompt Level")).toBeInTheDocument();
    expect(screen.getByText("Notes")).toBeInTheDocument();
  });

  it("renders data rows with correct accuracy", () => {
    render(<ProgressDataTable data={sampleData} />);
    expect(screen.getByText("80%")).toBeInTheDocument();
    expect(screen.getByText("65%")).toBeInTheDocument();
    expect(screen.getByText("90%")).toBeInTheDocument();
  });

  it("renders trials as correct/trials format", () => {
    render(<ProgressDataTable data={sampleData} />);
    expect(screen.getByText("16/20")).toBeInTheDocument();
    // dp2 has correct undefined, shows "?/10"
    expect(screen.getByText("?/10")).toBeInTheDocument();
  });

  it("renders prompt level labels", () => {
    render(<ProgressDataTable data={sampleData} />);
    expect(screen.getByText("Independent")).toBeInTheDocument();
    expect(screen.getByText("Verbal Cue")).toBeInTheDocument();
  });

  it("renders source labels", () => {
    render(<ProgressDataTable data={sampleData} />);
    expect(screen.getByText("Session Note")).toBeInTheDocument();
    expect(screen.getByText("Manual")).toBeInTheDocument();
    expect(screen.getByText("In-App")).toBeInTheDocument();
  });

  it("renders notes when present", () => {
    render(<ProgressDataTable data={sampleData} />);
    expect(screen.getByText("Good session")).toBeInTheDocument();
  });

  it("shows dash for missing trials", () => {
    render(<ProgressDataTable data={sampleData} />);
    // dp3 has no trials — shows em dash "\u2014"
    const cells = screen.getAllByText("\u2014");
    expect(cells.length).toBeGreaterThanOrEqual(1);
  });
});
