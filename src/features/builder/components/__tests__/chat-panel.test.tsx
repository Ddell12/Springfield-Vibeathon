import { fireEvent, render, screen } from "@testing-library/react";

import { ChatPanel } from "../chat-panel";

vi.mock("convex/react", () => ({
  useQuery: vi.fn(),
  useMutation: vi.fn(() => vi.fn()),
}));

vi.mock("motion/react", () => ({
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
      <div {...props}>{children}</div>
    ),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));

vi.mock("react-markdown", () => ({
  default: ({ children }: { children: string }) => (
    <div data-testid="markdown">{children}</div>
  ),
}));

vi.mock("remark-gfm", () => ({ default: () => {} }));

// Mock the hooks
vi.mock("../../hooks/use-session", () => ({
  useSessionMessages: vi.fn(() => null),
  useBlueprint: vi.fn(() => null),
}));

import { useBlueprint, useSessionMessages } from "../../hooks/use-session";

const defaultProps = {
  sessionId: null,
  session: null,
  onSubmit: vi.fn(),
};

describe("ChatPanel", () => {
  beforeEach(() => {
    vi.mocked(useSessionMessages).mockReturnValue(null);
    vi.mocked(useBlueprint).mockReturnValue(null);
    defaultProps.onSubmit.mockClear();
  });

  it("shows welcome header when no session", () => {
    render(<ChatPanel {...defaultProps} />);
    expect(
      screen.getByText("What does your child need?")
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Describe the therapy tool you're imagining/)
    ).toBeInTheDocument();
  });

  it("shows suggestion chips when no session", () => {
    render(<ChatPanel {...defaultProps} />);
    expect(screen.getByText("Morning routine schedule")).toBeInTheDocument();
    expect(screen.getByText("Feelings communication board")).toBeInTheDocument();
    expect(screen.getByText("Star reward chart")).toBeInTheDocument();
  });

  it("clicking a suggestion chip calls onSubmit", () => {
    render(<ChatPanel {...defaultProps} />);
    fireEvent.click(screen.getByText("Star reward chart"));
    expect(defaultProps.onSubmit).toHaveBeenCalledWith("Star reward chart");
  });

  it("shows prompt input when no session", () => {
    render(<ChatPanel {...defaultProps} />);
    expect(
      screen.getByPlaceholderText("Describe what you need...")
    ).toBeInTheDocument();
  });

  it("shows prompt input when session state is idle", () => {
    render(<ChatPanel {...defaultProps} session={{ state: "idle" }} />);
    expect(
      screen.getByPlaceholderText("Describe what you need...")
    ).toBeInTheDocument();
  });

  it("shows prompt input when session state is complete", () => {
    render(<ChatPanel {...defaultProps} session={{ state: "complete" }} />);
    expect(
      screen.getByPlaceholderText("Ask to modify the board...")
    ).toBeInTheDocument();
  });

  it("shows prompt input when session state is failed", () => {
    render(<ChatPanel {...defaultProps} session={{ state: "failed" }} />);
    expect(
      screen.getByPlaceholderText("Describe what you need...")
    ).toBeInTheDocument();
  });

  it("hides prompt input during active pipeline states", () => {
    const activePipelineStates = [
      "blueprinting",
      "phase_generating",
      "phase_implementing",
      "deploying",
      "validating",
    ];
    for (const state of activePipelineStates) {
      const { unmount } = render(
        <ChatPanel {...defaultProps} session={{ state }} />
      );
      expect(
        screen.queryByPlaceholderText("Describe what you need...")
      ).toBeNull();
      unmount();
    }
  });

  it("submit button is disabled when input is empty", () => {
    render(<ChatPanel {...defaultProps} />);
    const sendButton = screen.getByRole("button", { name: "send" });
    expect(sendButton).toBeDisabled();
  });

  it("calls onSubmit when form is submitted with input", () => {
    render(<ChatPanel {...defaultProps} />);
    const input = screen.getByPlaceholderText("Describe what you need...");
    fireEvent.change(input, { target: { value: "Morning routine schedule" } });
    fireEvent.submit(input.closest("form")!);
    expect(defaultProps.onSubmit).toHaveBeenCalledWith(
      "Morning routine schedule"
    );
  });

  it("clears input after submit", () => {
    render(<ChatPanel {...defaultProps} />);
    const input = screen.getByPlaceholderText(
      "Describe what you need..."
    ) as HTMLInputElement;
    fireEvent.change(input, { target: { value: "Star reward chart" } });
    fireEvent.submit(input.closest("form")!);
    expect(input.value).toBe("");
  });

  it("renders messages when session has messages", () => {
    const messages = [
      {
        _id: "m1",
        role: "user",
        content: "Build a morning schedule",
        sessionId: "s1",
      },
      {
        _id: "m2",
        role: "assistant",
        content: "Here is your blueprint",
        sessionId: "s1",
      },
    ];
    vi.mocked(useSessionMessages).mockReturnValue(
      messages as ReturnType<typeof useSessionMessages>
    );
    render(
      <ChatPanel {...defaultProps} session={{ state: "idle" }} sessionId={"s1" as ReturnType<typeof useSessionMessages>[0]["sessionId"]} />
    );
    expect(screen.getByText("Build a morning schedule")).toBeInTheDocument();
    // Assistant message is rendered via ReactMarkdown mock
    expect(screen.getByTestId("markdown")).toBeInTheDocument();
  });

  it("shows blueprint card when state is blueprinting and blueprint exists (unapproved)", () => {
    const blueprint = {
      blueprint: {
        title: "Morning Routine",
        therapyGoal: "Build independence",
        targetSkill: "Self-care",
        ageRange: "5-8",
      },
      markdownPreview: "...",
      approved: false,
    };
    vi.mocked(useBlueprint).mockReturnValue(
      blueprint as ReturnType<typeof useBlueprint>
    );
    render(
      <ChatPanel
        {...defaultProps}
        session={{ state: "blueprinting" }}
        sessionId={"s1" as ReturnType<typeof useSessionMessages>[0]["sessionId"]}
      />
    );
    expect(screen.getByText("App Blueprint")).toBeInTheDocument();
    expect(screen.getByText("Morning Routine")).toBeInTheDocument();
  });

  it("shows error state when session failed", () => {
    render(
      <ChatPanel
        {...defaultProps}
        session={{ state: "failed", failureReason: "E2B sandbox timed out" }}
      />
    );
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    expect(screen.getByText("E2B sandbox timed out")).toBeInTheDocument();
  });

  it("shows working status message when pipeline is active", () => {
    render(
      <ChatPanel
        {...defaultProps}
        session={{
          state: "phase_generating",
          stateMessage: "Generating phase 1...",
          currentPhaseIndex: 0,
          totalPhasesPlanned: 3,
        }}
      />
    );
    expect(screen.getByText("Generating phase 1...")).toBeInTheDocument();
    expect(screen.getByText("Phase 1 of 3")).toBeInTheDocument();
  });
});
