import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, test, expect } from "vitest";
import { TokenBoard } from "../token-board";
import type { TokenBoardConfig } from "../../types/tool-configs";

// motion/react produces real DOM in jsdom — no mock needed.
// The zustand store is used internally by the component — let it work naturally.

const mockTokenConfig: TokenBoardConfig = {
  type: "token-board",
  title: "Star Rewards",
  totalTokens: 5,
  earnedTokens: 0,
  tokenIcon: "star",
  reinforcers: [{ id: "r1", label: "iPad Time", icon: "tablet" }],
  celebrationAnimation: "confetti",
};

describe("TokenBoard", () => {
  test("renders title and reward info", () => {
    render(<TokenBoard config={mockTokenConfig} />);

    expect(screen.getByText("Star Rewards")).toBeInTheDocument();
    expect(screen.getByText(/iPad Time/i)).toBeInTheDocument();
  });

  test("shows correct initial earned count", () => {
    render(<TokenBoard config={mockTokenConfig} />);

    expect(screen.getByText(/0 of 5 stars earned/i)).toBeInTheDocument();
  });

  test("earns a token on button click", async () => {
    const user = userEvent.setup();
    render(<TokenBoard config={mockTokenConfig} />);

    const earnButton = screen.getByRole("button", { name: /earn star/i });
    await user.click(earnButton);

    expect(screen.getByText(/1 of 5 stars earned/i)).toBeInTheDocument();
  });

  test("disables earn button when all tokens earned", async () => {
    const user = userEvent.setup();
    render(<TokenBoard config={mockTokenConfig} />);

    const earnButton = screen.getByRole("button", { name: /earn star/i });

    // Earn all 5 tokens
    await user.click(earnButton);
    await user.click(earnButton);
    await user.click(earnButton);
    await user.click(earnButton);
    await user.click(earnButton);

    expect(earnButton).toBeDisabled();
  });

  test("shows celebration when all tokens earned", async () => {
    const user = userEvent.setup();
    render(<TokenBoard config={mockTokenConfig} />);

    const earnButton = screen.getByRole("button", { name: /earn star/i });

    // Earn all 5 tokens
    await user.click(earnButton);
    await user.click(earnButton);
    await user.click(earnButton);
    await user.click(earnButton);
    await user.click(earnButton);

    expect(screen.getByText(/you did it!/i)).toBeInTheDocument();
  });

  test("reset clears all earned tokens", async () => {
    const user = userEvent.setup();
    render(<TokenBoard config={mockTokenConfig} />);

    const earnButton = screen.getByRole("button", { name: /earn star/i });

    // Earn some tokens
    await user.click(earnButton);
    await user.click(earnButton);
    await user.click(earnButton);

    expect(screen.getByText(/3 of 5 stars earned/i)).toBeInTheDocument();

    // Reset
    const resetButton = screen.getByRole("button", { name: /reset/i });
    await user.click(resetButton);

    expect(screen.getByText(/0 of 5 stars earned/i)).toBeInTheDocument();
  });

  test("shows progress percentage", async () => {
    const user = userEvent.setup();
    render(<TokenBoard config={mockTokenConfig} />);

    const earnButton = screen.getByRole("button", { name: /earn star/i });

    // Earn 3 of 5 = 60%
    await user.click(earnButton);
    await user.click(earnButton);
    await user.click(earnButton);

    expect(screen.getByText("60%")).toBeInTheDocument();
  });
});
