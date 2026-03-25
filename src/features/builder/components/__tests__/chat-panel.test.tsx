import { fireEvent,render, screen } from "@testing-library/react";

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

import { useBlueprint,useSessionMessages } from "../../hooks/use-session";

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
      screen.getByText("What would you like to build?")
    ).toBeInTheDocument();
    expect(
      screen.getByText("Describe a therapy tool and I'll build it for you.")
    ).toBeInTheDocument();
  });

  it("shows prompt input when no session", () => {
    render(<ChatPanel {...defaultProps} />);
    expect(
      screen.getByPlaceholderText("Describe your therapy tool...")
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Build" })).toBeInTheDocument();
  });

  it("shows prompt input when session state is idle", () => {
    render(<ChatPanel {...defaultProps} session={{ state: "idle" }} />);
    expect(
      screen.getByPlaceholderText("Describe your therapy tool...")
    ).toBeInTheDocument();
  });

  it("shows prompt input when session state is complete with 'Request changes' placeholder", () => {
    render(<ChatPanel {...defaultProps} session={{ state: "complete" }} />);
    expect(
      screen.getByPlaceholderText("Request changes...")
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Send" })).toBeInTheDocument();
  });

  it("hides prompt input during active pipeline states", () => {
    const activePipelineStates = [
      "blueprinting",
      "generating",
      "implementing",
      "deploying",
      "validating",
    ];
    for (const state of activePipelineStates) {
      const { unmount } = render(
        <ChatPanel {...defaultProps} session={{ state }} />
      );
      expect(
        screen.queryByPlaceholderText("Describe your therapy tool...")
      ).toBeNull();
      unmount();
    }
  });

  it("submit button is disabled when input is empty", () => {
    render(<ChatPanel {...defaultProps} />);
    expect(screen.getByRole("button", { name: "Build" })).toBeDisabled();
  });

  it("calls onSubmit when form is submitted with input", () => {
    render(<ChatPanel {...defaultProps} />);
    const input = screen.getByPlaceholderText("Describe your therapy tool...");
    fireEvent.change(input, { target: { value: "Morning routine schedule" } });
    expect(screen.getByRole("button", { name: "Build" })).not.toBeDisabled();
    fireEvent.submit(input.closest("form")!);
    expect(defaultProps.onSubmit).toHaveBeenCalledWith(
      "Morning routine schedule"
    );
  });

  it("clears input after submit", () => {
    render(<ChatPanel {...defaultProps} />);
    const input = screen.getByPlaceholderText(
      "Describe your therapy tool..."
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

  it("does not show blueprint card when blueprint is approved", () => {
    const blueprint = {
      blueprint: { title: "Morning Routine" },
      markdownPreview: "...",
      approved: true,
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
    expect(screen.queryByText("App Blueprint")).toBeNull();
  });

  it("shows working status message when pipeline is active (not idle/complete/failed/blueprinting)", () => {
    render(
      <ChatPanel
        {...defaultProps}
        session={{
          state: "generating",
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
