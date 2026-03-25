// src/features/builder/components/__tests__/code-panel.test.tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { CodePanel } from "../code-panel";

const sampleFiles = [
  {
    path: "src/App.tsx",
    contents:
      'import React from "react";\n\nexport default function App() {\n  return <div className="p-4">Token Board</div>;\n}',
    version: 1,
  },
  {
    path: "src/components/TokenBoard.tsx",
    contents: "export function TokenBoard() { return <div>Tokens</div>; }",
    version: 1,
  },
];

const defaultProps = {
  files: [],
  status: "idle" as const,
};

describe("CodePanel — streaming builder contract", () => {
  it("renders without crashing with empty files", () => {
    render(<CodePanel {...defaultProps} />);
  });

  it("shows empty state when no files and status is idle", () => {
    render(<CodePanel {...defaultProps} />);
    // Should show placeholder telling user code will appear here
    const emptyState = screen.queryByText(/code will appear|no files|start building/i);
    expect(emptyState).toBeTruthy();
  });

  it("shows generating indicator when status is generating and no files yet", () => {
    render(<CodePanel files={[]} status="generating" />);
    const indicator =
      screen.queryByText(/generating|building/i) ??
      document.querySelector(".animate-pulse, .animate-spin");
    expect(indicator).toBeTruthy();
  });

  it("renders file tabs when files are provided", () => {
    render(<CodePanel files={sampleFiles} status="live" />);
    // Each file should have a tab with its filename
    expect(screen.getByText("App.tsx")).toBeTruthy();
    expect(screen.getByText("TokenBoard.tsx")).toBeTruthy();
  });

  it("displays the first file's contents by default", () => {
    render(<CodePanel files={sampleFiles} status="live" />);
    // The first file's content should be visible
    expect(screen.getByText(/Token Board/)).toBeTruthy();
  });

  it("switches to different file when tab is clicked", async () => {
    render(<CodePanel files={sampleFiles} status="live" />);
    const user = userEvent.setup();
    // Click the second file tab
    await user.click(screen.getByText("TokenBoard.tsx"));
    // Now the second file's content should be visible
    expect(screen.getByText(/Tokens/)).toBeTruthy();
  });

  it("shows file count or summary", () => {
    render(<CodePanel files={sampleFiles} status="live" />);
    // Panel header or subtitle should indicate number of files
    // e.g. "2 files" or "src/App.tsx"
    const fileIndicator = screen.queryByText(/2 file|src\/App/i);
    expect(fileIndicator).toBeTruthy();
  });

  it("shows a generating indicator while files are still streaming in", () => {
    render(<CodePanel files={[sampleFiles[0]]} status="generating" />);
    // Even with some files, should still show generating state
    const indicator =
      screen.queryByText(/generating|writing/i) ??
      document.querySelector(".animate-pulse");
    expect(indicator).toBeTruthy();
  });

  it("renders file path in full in the content area or breadcrumb", () => {
    render(<CodePanel files={sampleFiles} status="live" />);
    // The active file's full path should be visible somewhere
    const pathIndicator =
      screen.queryByText("src/App.tsx") ??
      screen.queryByText(/src\/App/);
    expect(pathIndicator).toBeTruthy();
  });

  it("does not crash when files array is updated (streaming scenario)", () => {
    const { rerender } = render(<CodePanel files={[]} status="generating" />);
    // Simulate files arriving one by one
    rerender(<CodePanel files={[sampleFiles[0]]} status="generating" />);
    rerender(<CodePanel files={sampleFiles} status="generating" />);
    rerender(<CodePanel files={sampleFiles} status="live" />);
    // Should end up showing final state without errors
    expect(screen.getByText("App.tsx")).toBeTruthy();
  });
});
