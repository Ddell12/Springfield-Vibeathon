import { fireEvent,render, screen } from "@testing-library/react";

import { BlueprintCard } from "../blueprint-card";

const approveMock = vi.fn();
const requestChangesMock = vi.fn();

vi.mock("convex/react", () => ({
  useQuery: vi.fn(),
  // useMutation is identified by the api ref string (mocked above)
  useMutation: vi.fn((ref: string) => {
    if (ref === "blueprints:approve") return approveMock;
    if (ref === "blueprints:requestChanges") return requestChangesMock;
    return vi.fn();
  }),
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

vi.mock("../../../../../convex/_generated/api", () => ({
  api: {
    blueprints: {
      approve: "blueprints:approve",
      requestChanges: "blueprints:requestChanges",
    },
  },
}));

const mockSessionId = "session123" as Parameters<typeof BlueprintCard>[0]["sessionId"];

const mockBlueprint = {
  blueprint: {
    title: "Morning Routine Scheduler",
    therapyGoal: "Build independence in daily tasks",
    targetSkill: "Self-care routines",
    ageRange: "5-8 years",
    interactionModel: "Tap to advance steps",
    reinforcementStrategy: {
      type: "token",
      description: "Star tokens for each step",
    },
    implementationRoadmap: [
      { phase: "Phase 1", description: "Basic schedule display" },
      { phase: "Phase 2", description: "Interactive tapping" },
    ],
  },
  markdownPreview: "# Morning Routine...",
  approved: false,
};

describe("BlueprintCard", () => {
  beforeEach(() => {
    approveMock.mockClear();
    requestChangesMock.mockClear();
  });

  it("renders the App Blueprint heading", () => {
    render(
      <BlueprintCard sessionId={mockSessionId} blueprint={mockBlueprint} />
    );
    expect(screen.getByText("App Blueprint")).toBeInTheDocument();
  });

  it("renders blueprint title", () => {
    render(
      <BlueprintCard sessionId={mockSessionId} blueprint={mockBlueprint} />
    );
    expect(
      screen.getByText("Morning Routine Scheduler")
    ).toBeInTheDocument();
  });

  it("renders therapy goal", () => {
    render(
      <BlueprintCard sessionId={mockSessionId} blueprint={mockBlueprint} />
    );
    expect(
      screen.getByText(/Build independence in daily tasks/)
    ).toBeInTheDocument();
  });

  it("renders target skill", () => {
    render(
      <BlueprintCard sessionId={mockSessionId} blueprint={mockBlueprint} />
    );
    expect(screen.getByText(/Self-care routines/)).toBeInTheDocument();
  });

  it("renders age range", () => {
    render(
      <BlueprintCard sessionId={mockSessionId} blueprint={mockBlueprint} />
    );
    expect(screen.getByText(/5-8 years/)).toBeInTheDocument();
  });

  it("renders implementation roadmap phases", () => {
    render(
      <BlueprintCard sessionId={mockSessionId} blueprint={mockBlueprint} />
    );
    expect(screen.getByText(/Basic schedule display/)).toBeInTheDocument();
    expect(screen.getByText(/Interactive tapping/)).toBeInTheDocument();
  });

  it("'Looks Good' button calls approve mutation with sessionId", async () => {
    render(
      <BlueprintCard sessionId={mockSessionId} blueprint={mockBlueprint} />
    );
    fireEvent.click(screen.getByRole("button", { name: "Looks Good" }));
    expect(approveMock).toHaveBeenCalledWith({ sessionId: mockSessionId });
  });

  it("'Request Changes' toggles feedback input", () => {
    render(
      <BlueprintCard sessionId={mockSessionId} blueprint={mockBlueprint} />
    );
    expect(
      screen.queryByPlaceholderText("What should change?")
    ).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Request Changes" }));

    expect(
      screen.getByPlaceholderText("What should change?")
    ).toBeInTheDocument();
  });

  it("Send button is disabled when feedback is empty", () => {
    render(
      <BlueprintCard sessionId={mockSessionId} blueprint={mockBlueprint} />
    );
    fireEvent.click(screen.getByRole("button", { name: "Request Changes" }));
    expect(screen.getByRole("button", { name: "Send" })).toBeDisabled();
  });

  it("Send button is enabled when feedback has text", () => {
    render(
      <BlueprintCard sessionId={mockSessionId} blueprint={mockBlueprint} />
    );
    fireEvent.click(screen.getByRole("button", { name: "Request Changes" }));
    fireEvent.change(screen.getByPlaceholderText("What should change?"), {
      target: { value: "Make it more colorful" },
    });
    expect(screen.getByRole("button", { name: "Send" })).not.toBeDisabled();
  });

  it("Send button calls requestChanges mutation with feedback", async () => {
    render(
      <BlueprintCard sessionId={mockSessionId} blueprint={mockBlueprint} />
    );
    fireEvent.click(screen.getByRole("button", { name: "Request Changes" }));
    fireEvent.change(screen.getByPlaceholderText("What should change?"), {
      target: { value: "Add more colors" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));
    expect(requestChangesMock).toHaveBeenCalledWith({
      sessionId: mockSessionId,
      feedback: "Add more colors",
    });
  });

  it("hides feedback input after sending and returns to approve/reject buttons", async () => {
    const { waitFor } = await import("@testing-library/react");
    render(
      <BlueprintCard sessionId={mockSessionId} blueprint={mockBlueprint} />
    );
    fireEvent.click(screen.getByRole("button", { name: "Request Changes" }));
    fireEvent.change(screen.getByPlaceholderText("What should change?"), {
      target: { value: "More colors" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));

    // After send (async), feedback UI collapses back
    await waitFor(() => {
      expect(
        screen.queryByPlaceholderText("What should change?")
      ).toBeNull();
    });
    expect(
      screen.getByRole("button", { name: "Looks Good" })
    ).toBeInTheDocument();
  });
});
