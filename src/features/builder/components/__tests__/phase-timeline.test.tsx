import { fireEvent,render, screen } from "@testing-library/react";

import { PhaseTimeline } from "../phase-timeline";

vi.mock("motion/react", () => ({
  motion: {
    div: ({
      children,
      animate: _animate,
      transition: _transition,
      ...props
    }: React.HTMLAttributes<HTMLDivElement> & {
      animate?: unknown;
      transition?: unknown;
    }) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));

const mockPhases = [
  { _id: "p1", name: "Foundation", status: "completed", index: 0 },
  { _id: "p2", name: "Interactions", status: "generating", index: 1 },
  { _id: "p3", name: "Polish", status: "pending", index: 2 },
];

describe("PhaseTimeline", () => {
  it("renders the correct number of phase segments", () => {
    render(
      <PhaseTimeline phases={mockPhases} currentIndex={1} />
    );
    // Each phase renders a button
    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(3);
  });

  it("renders phase name labels", () => {
    render(
      <PhaseTimeline phases={mockPhases} currentIndex={1} />
    );
    expect(screen.getByText("Foundation")).toBeInTheDocument();
    expect(screen.getByText("Interactions")).toBeInTheDocument();
    expect(screen.getByText("Polish")).toBeInTheDocument();
  });

  it("applies completed color class for completed phase", () => {
    render(
      <PhaseTimeline phases={mockPhases} currentIndex={1} />
    );
    // Foundation is completed — its motion div should have bg-green-500
    const foundationBtn = screen.getByTitle("Foundation: completed");
    const indicator = foundationBtn.querySelector(".bg-green-500");
    expect(indicator).toBeInTheDocument();
  });

  it("applies pending color class for pending phase", () => {
    render(
      <PhaseTimeline phases={mockPhases} currentIndex={1} />
    );
    const polishBtn = screen.getByTitle("Polish: pending");
    const indicator = polishBtn.querySelector(".bg-muted");
    expect(indicator).toBeInTheDocument();
  });

  it("applies blue color class for generating phase", () => {
    render(
      <PhaseTimeline phases={mockPhases} currentIndex={1} />
    );
    const interactionsBtn = screen.getByTitle("Interactions: generating");
    const indicator = interactionsBtn.querySelector(".bg-blue-500");
    expect(indicator).toBeInTheDocument();
  });

  it("applies error color class for failed phase", () => {
    const failedPhases = [
      { _id: "p1", name: "Foundation", status: "failed", index: 0 },
    ];
    render(
      <PhaseTimeline phases={failedPhases} currentIndex={0} />
    );
    const btn = screen.getByTitle("Foundation: failed");
    const indicator = btn.querySelector(".bg-red-500");
    expect(indicator).toBeInTheDocument();
  });

  it("shows check_circle icon for completed phase", () => {
    render(
      <PhaseTimeline phases={mockPhases} currentIndex={1} />
    );
    const foundationBtn = screen.getByTitle("Foundation: completed");
    const checkIcon = foundationBtn.querySelector(".material-symbols-outlined");
    expect(checkIcon?.textContent?.trim()).toBe("check_circle");
  });

  it("shows error icon for failed phase", () => {
    const failedPhases = [
      { _id: "p1", name: "Foundation", status: "failed", index: 0 },
    ];
    render(
      <PhaseTimeline phases={failedPhases} currentIndex={0} />
    );
    const btn = screen.getByTitle("Foundation: failed");
    const errorIcon = btn.querySelector(".material-symbols-outlined");
    expect(errorIcon?.textContent?.trim()).toBe("error");
  });

  it("calls onPhaseClick with correct index when a phase button is clicked", () => {
    const onPhaseClick = vi.fn();
    render(
      <PhaseTimeline
        phases={mockPhases}
        currentIndex={1}
        onPhaseClick={onPhaseClick}
      />
    );
    fireEvent.click(screen.getByTitle("Polish: pending"));
    expect(onPhaseClick).toHaveBeenCalledWith(2);
  });

  it("calls onPhaseClick for the first phase with index 0", () => {
    const onPhaseClick = vi.fn();
    render(
      <PhaseTimeline
        phases={mockPhases}
        currentIndex={1}
        onPhaseClick={onPhaseClick}
      />
    );
    fireEvent.click(screen.getByTitle("Foundation: completed"));
    expect(onPhaseClick).toHaveBeenCalledWith(0);
  });

  it("does not crash when onPhaseClick is not provided", () => {
    render(
      <PhaseTimeline phases={mockPhases} currentIndex={1} />
    );
    // Click without handler — should not throw
    expect(() =>
      fireEvent.click(screen.getByTitle("Foundation: completed"))
    ).not.toThrow();
  });

  it("renders single phase without error", () => {
    const singlePhase = [
      { _id: "p1", name: "MVP", status: "completed", index: 0 },
    ];
    render(<PhaseTimeline phases={singlePhase} currentIndex={0} />);
    expect(screen.getByText("MVP")).toBeInTheDocument();
  });
});
