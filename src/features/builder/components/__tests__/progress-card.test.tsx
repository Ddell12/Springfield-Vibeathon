import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { Activity } from "../../hooks/use-streaming";
import type { StreamingStatus } from "../../hooks/use-streaming";
import { ProgressCard } from "../progress-card";

describe("ProgressCard", () => {
  const baseProps = {
    status: "generating" as StreamingStatus,
    activities: [] as Activity[],
    startTime: Date.now(),
  };

  it("renders when status is generating", () => {
    render(<ProgressCard {...baseProps} />);
    expect(screen.getByText("Building your app...")).toBeInTheDocument();
  });

  it("shows phase 1 as active initially with no activities", () => {
    render(<ProgressCard {...baseProps} />);
    expect(screen.getByText("Understanding your request")).toBeInTheDocument();
  });

  it("shows phase 2 as active when a writing_file activity exists", () => {
    const activities: Activity[] = [
      { id: "1", type: "thinking", message: "Thinking...", timestamp: Date.now() },
      { id: "2", type: "writing_file", message: "Writing App.tsx", path: "App.tsx", timestamp: Date.now() },
    ];
    render(<ProgressCard {...baseProps} activities={activities} />);
    const items = screen.getAllByRole("listitem");
    expect(items[0]).toHaveTextContent("Understanding your request");
    expect(items[1]).toHaveTextContent("Writing components");
  });

  it("shows phase 3 as active when status is bundling-like (file_written + no complete)", () => {
    const activities: Activity[] = [
      { id: "1", type: "thinking", message: "Thinking...", timestamp: Date.now() },
      { id: "2", type: "file_written", message: "Done", path: "App.tsx", timestamp: Date.now() },
    ];
    render(<ProgressCard {...baseProps} activities={activities} status="generating" />);
    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(4);
  });

  it("shows all phases complete when status is live", () => {
    const activities: Activity[] = [
      { id: "1", type: "complete", message: "Done", timestamp: Date.now() },
    ];
    render(<ProgressCard {...baseProps} activities={activities} status="live" />);
    expect(screen.getByText("Ready to preview")).toBeInTheDocument();
  });

  it("returns null when status is idle", () => {
    const { container } = render(<ProgressCard {...baseProps} status="idle" />);
    expect(container.firstChild).toBeNull();
  });

  it("shows collapsed summary when status is live", () => {
    render(<ProgressCard {...baseProps} status="live" startTime={Date.now() - 30000} />);
    expect(screen.getByText(/Built in/)).toBeInTheDocument();
  });
});
