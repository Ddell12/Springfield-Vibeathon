import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("convex/react", () => ({
  useMutation: vi.fn(() => vi.fn().mockResolvedValue(undefined)),
}));
vi.mock("@convex/_generated/api", () => ({ api: { tools: { logEvent: "tools:logEvent" } } }));

import { TokenBoardRuntime } from "../runtime";
import type { TokenBoardConfig } from "../schema";

const mockOnEvent = vi.fn();

const mockConfig: TokenBoardConfig = {
  title: "Token Board",
  tokenCount: 3,
  rewardLabel: "Screen time",
  tokenShape: "star",
  tokenColor: "#FBBF24",
  highContrast: false,
};

describe("TokenBoardRuntime", () => {
  it("renders the title", () => {
    render(
      <TokenBoardRuntime config={mockConfig} shareToken="tok" onEvent={mockOnEvent} />
    );
    expect(screen.getByText("Token Board")).toBeInTheDocument();
  });

  it("renders the correct number of token slots", () => {
    render(
      <TokenBoardRuntime config={mockConfig} shareToken="tok" onEvent={mockOnEvent} />
    );
    // 3 token slots should be rendered
    const tokenButtons = screen.getAllByRole("button", { name: /token/i });
    expect(tokenButtons).toHaveLength(3);
  });

  it("renders the reward label", () => {
    render(
      <TokenBoardRuntime config={mockConfig} shareToken="tok" onEvent={mockOnEvent} />
    );
    expect(screen.getByText("Screen time")).toBeInTheDocument();
  });

  it("logs token_added when a token is tapped", () => {
    mockOnEvent.mockClear();
    render(
      <TokenBoardRuntime config={mockConfig} shareToken="tok" onEvent={mockOnEvent} />
    );
    fireEvent.click(screen.getAllByRole("button", { name: /token/i })[0]);
    expect(mockOnEvent).toHaveBeenCalledWith("token_added", expect.any(String));
  });

  it("logs activity_completed when all tokens are filled", () => {
    mockOnEvent.mockClear();
    render(
      <TokenBoardRuntime config={mockConfig} shareToken="tok" onEvent={mockOnEvent} />
    );
    const tokenButtons = screen.getAllByRole("button", { name: /token/i });
    // Fill all 3 tokens
    fireEvent.click(tokenButtons[0]);
    fireEvent.click(tokenButtons[1]);
    fireEvent.click(tokenButtons[2]);
    expect(mockOnEvent).toHaveBeenCalledWith("activity_completed", expect.any(String));
  });

  it("shows reset button", () => {
    render(
      <TokenBoardRuntime config={mockConfig} shareToken="tok" onEvent={mockOnEvent} />
    );
    expect(screen.getByRole("button", { name: /reset/i })).toBeInTheDocument();
  });
});
