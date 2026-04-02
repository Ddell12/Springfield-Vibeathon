import { fireEvent,render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("convex/react", () => ({
  useMutation: vi.fn(() => vi.fn().mockResolvedValue(undefined)),
}));
vi.mock("@convex/_generated/api", () => ({ api: { tools: { logEvent: "tools:logEvent" } } }));

import { TokenBoardRuntime } from "../runtime";
import type { TokenBoardConfig } from "../schema";

const voice = { speak: vi.fn(), stop: vi.fn(), status: "idle" as const };
const onEvent = vi.fn();
const config = {
  title: "Token Board", tokenCount: 3, rewardLabel: "iPad time",
  rewardImageUrl: undefined, tokenShape: "star" as const,
  tokenColor: "#FBBF24", highContrast: false,
};

describe("TokenBoardRuntime — styled tokens", () => {
  it("does not render emoji tokens", () => {
    render(<TokenBoardRuntime config={config} mode="preview" onEvent={onEvent} voice={voice} />);
    expect(screen.queryByText("⭐")).not.toBeInTheDocument();
  });

  it("applies tokenColor to filled tokens via inline style", () => {
    render(<TokenBoardRuntime config={config} mode="preview" onEvent={onEvent} voice={voice} />);
    fireEvent.click(screen.getByRole("button", { name: /token 1/i }));
    const filledToken = screen.getByRole("button", { name: /token 1/i });
    expect(filledToken).toHaveStyle("background-color: rgb(251, 191, 36)");
  });
});

describe("TokenBoardRuntime — undo", () => {
  it("undo is disabled when no tokens earned", () => {
    render(<TokenBoardRuntime config={config} mode="preview" onEvent={onEvent} voice={voice} />);
    expect(screen.getByRole("button", { name: /undo/i })).toBeDisabled();
  });

  it("undo decrements earned count", () => {
    render(<TokenBoardRuntime config={config} mode="preview" onEvent={onEvent} voice={voice} />);
    fireEvent.click(screen.getByRole("button", { name: /token 1/i }));
    expect(screen.getByRole("button", { name: /undo/i })).not.toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: /undo/i }));
    expect(screen.getByRole("button", { name: /undo/i })).toBeDisabled();
  });
});

describe("TokenBoardRuntime — celebration", () => {
  it("shows celebration overlay when all tokens earned", () => {
    render(<TokenBoardRuntime config={config} mode="preview" onEvent={onEvent} voice={voice} />);
    fireEvent.click(screen.getByRole("button", { name: /token 1/i }));
    fireEvent.click(screen.getByRole("button", { name: /token 2/i }));
    fireEvent.click(screen.getByRole("button", { name: /token 3/i }));
    expect(screen.getByText("iPad time")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /start over/i })).toBeInTheDocument();
  });

  it("shows reward image in celebration when rewardImageUrl is set", () => {
    const cfg = { ...config, rewardImageUrl: "https://example.com/ipad.jpg" };
    render(<TokenBoardRuntime config={cfg} mode="preview" onEvent={onEvent} voice={voice} />);
    fireEvent.click(screen.getByRole("button", { name: /token 1/i }));
    fireEvent.click(screen.getByRole("button", { name: /token 2/i }));
    fireEvent.click(screen.getByRole("button", { name: /token 3/i }));
    expect(screen.getByAltText("reward")).toHaveAttribute("src", "https://example.com/ipad.jpg");
  });
});

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
