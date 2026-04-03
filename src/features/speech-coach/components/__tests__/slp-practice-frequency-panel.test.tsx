import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { SlpPracticeFrequencyPanel } from "../slp-practice-frequency-panel";

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

const MOCK_FREQUENCY = {
  last7Count: 3,
  last30Count: 8,
  avgPerWeek: 2.1,
  consistencyLabel: "Medium" as const,
  lastSessionAt: Date.now() - 86400000,
  lastSessionSounds: ["/s/", "/r/"],
};

describe("SlpPracticeFrequencyPanel", () => {
  it("shows sessions this week", () => {
    render(<SlpPracticeFrequencyPanel frequency={MOCK_FREQUENCY} />);
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("shows average per week", () => {
    render(<SlpPracticeFrequencyPanel frequency={MOCK_FREQUENCY} />);
    expect(screen.getByText("2.1")).toBeInTheDocument();
  });

  it("shows consistency label", () => {
    render(<SlpPracticeFrequencyPanel frequency={MOCK_FREQUENCY} />);
    expect(screen.getByText("Medium")).toBeInTheDocument();
  });

  it("shows last session sounds", () => {
    render(<SlpPracticeFrequencyPanel frequency={MOCK_FREQUENCY} />);
    expect(screen.getByText("/s/")).toBeInTheDocument();
  });

  it("handles null frequency gracefully", () => {
    render(<SlpPracticeFrequencyPanel frequency={null} />);
    expect(screen.getByText(/No sessions yet/i)).toBeInTheDocument();
  });
});
