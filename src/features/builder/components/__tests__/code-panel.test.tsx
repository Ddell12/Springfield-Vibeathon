// src/features/builder/components/__tests__/code-panel.test.tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

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
    const emptyState = screen.queryByText(/start building/i);
    expect(emptyState).toBeTruthy();
  });

  it("shows generating indicator when status is generating and no files yet", () => {
    render(<CodePanel files={[]} status="generating" />);
    const indicator =
      screen.queryByText(/generating/i) ??
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

  it("file tabs have title attributes with full paths", () => {
    render(<CodePanel files={sampleFiles} status="live" />);
    // Full path is available via title attribute on tab buttons
    const appTab = screen.getByText("App.tsx").closest("button");
    expect(appTab?.getAttribute("title")).toBe("src/App.tsx");
  });

  it("shows a generating indicator while files are still streaming in", () => {
    render(<CodePanel files={[sampleFiles[0]]} status="generating" />);
    // Footer shows "Writing..." during generation
    const indicator =
      screen.queryByText(/writing/i) ??
      document.querySelector(".animate-pulse");
    expect(indicator).toBeTruthy();
  });

  it("shows file content in a pre element with code styling", () => {
    const { container } = render(
      <CodePanel files={sampleFiles} status="live" />
    );
    const preElement = container.querySelector("pre");
    expect(preElement).toBeTruthy();
    expect(preElement?.textContent).toContain("Token Board");
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
