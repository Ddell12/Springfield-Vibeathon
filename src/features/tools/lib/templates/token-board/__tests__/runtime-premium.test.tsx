import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("convex/react", () => ({
  useMutation: vi.fn(() => vi.fn().mockResolvedValue(undefined)),
}));
vi.mock("@convex/_generated/api", () => ({ api: { tools: { logEvent: "tools:logEvent" } } }));

import { TokenBoardRuntime } from "../runtime";
import type { TokenBoardConfig } from "../schema";

const MOCK_VOICE = {
  speak: vi.fn().mockResolvedValue(undefined),
  stop: vi.fn(),
  status: "idle" as const,
};

const tokenConfig: TokenBoardConfig = {
  title: "My Token Board",
  tokenCount: 3,
  rewardLabel: "Screen time",
  tokenShape: "star",
  tokenColor: "#FBBF24",
  highContrast: false,
};

describe("Token board runtime premium", () => {
  it("renders the app title", () => {
    render(
      <TokenBoardRuntime
        config={tokenConfig}
        mode="preview"
        onEvent={vi.fn()}
        voice={MOCK_VOICE}
      />
    );
    expect(screen.getByText(tokenConfig.title)).toBeInTheDocument();
  });

  it("renders progress (token slots)", () => {
    render(
      <TokenBoardRuntime
        config={tokenConfig}
        mode="preview"
        onEvent={vi.fn()}
        voice={MOCK_VOICE}
      />
    );
    const tokenButtons = screen.getAllByRole("button", { name: /token/i });
    expect(tokenButtons.length).toBe(tokenConfig.tokenCount);
  });

  it("renders the reward label", () => {
    render(
      <TokenBoardRuntime
        config={tokenConfig}
        mode="preview"
        onEvent={vi.fn()}
        voice={MOCK_VOICE}
      />
    );
    expect(screen.getByText("Screen time")).toBeInTheDocument();
  });
});
