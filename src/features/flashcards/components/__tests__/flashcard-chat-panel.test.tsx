import { fireEvent,render, screen } from "@testing-library/react";

import type { Id } from "../../../../../convex/_generated/dataModel";
import type { FlashcardStreamingStatus } from "../../hooks/use-flashcard-streaming";
import { FlashcardChatPanel } from "../flashcard-chat-panel";

// jsdom doesn't implement scrollIntoView
Element.prototype.scrollIntoView = vi.fn();

const mockUseQuery = vi.fn();

vi.mock("convex/react", () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
}));

vi.mock("@/shared/components/material-icon", () => ({
  MaterialIcon: ({ icon }: { icon: string }) => <span data-testid="material-icon">{icon}</span>,
}));

vi.mock("@/shared/components/ui/button", () => ({
  Button: ({
    children,
    ...props
  }: React.ComponentProps<"button">) => (
    <button {...props}>{children}</button>
  ),
}));

vi.mock("@/shared/components/ui/input", () => ({
  Input: (props: React.ComponentProps<"input">) => <input {...props} />,
}));

vi.mock("@/shared/components/voice-input", () => ({
  VoiceInput: () => <button data-testid="voice-input">mic</button>,
}));

const defaultProps = {
  sessionId: "session123" as Id<"sessions">,
  status: "idle" as FlashcardStreamingStatus,
  activityMessage: "",
  onSubmit: vi.fn(),
  pendingPrompt: null,
  onPendingPromptClear: vi.fn(),
};

describe("FlashcardChatPanel", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("renders loading state when messages are undefined", () => {
    mockUseQuery.mockReturnValue(undefined);
    render(<FlashcardChatPanel {...defaultProps} />);

    // Should render the form input even while loading
    expect(
      screen.getByLabelText("Describe the flashcards you want to create"),
    ).toBeInTheDocument();
  });

  it("renders empty messages state", () => {
    mockUseQuery.mockReturnValue([]);
    render(<FlashcardChatPanel {...defaultProps} />);

    expect(
      screen.getByLabelText("Describe the flashcards you want to create"),
    ).toBeInTheDocument();
    expect(screen.queryByText("You")).not.toBeInTheDocument();
    expect(screen.queryByText("Therapy Assistant")).not.toBeInTheDocument();
  });

  it("renders user and assistant messages", () => {
    mockUseQuery.mockReturnValue([
      { _id: "msg1", role: "user", content: "Make animal flashcards" },
      {
        _id: "msg2",
        role: "assistant",
        content: "Creating animal flashcards for you!",
      },
    ]);
    render(<FlashcardChatPanel {...defaultProps} />);

    expect(screen.getByText("Make animal flashcards")).toBeInTheDocument();
    expect(
      screen.getByText("Creating animal flashcards for you!"),
    ).toBeInTheDocument();
    expect(screen.getByText("You")).toBeInTheDocument();
    expect(screen.getByText("Therapy Assistant")).toBeInTheDocument();
  });

  it("does not render role label for system messages", () => {
    mockUseQuery.mockReturnValue([
      { _id: "msg1", role: "system", content: "Session started" },
    ]);
    render(<FlashcardChatPanel {...defaultProps} />);

    expect(screen.getByText("Session started")).toBeInTheDocument();
    expect(screen.queryByText("You")).not.toBeInTheDocument();
    expect(screen.queryByText("Therapy Assistant")).not.toBeInTheDocument();
  });

  it("shows pending prompt before messages arrive from Convex", () => {
    mockUseQuery.mockReturnValue(undefined);
    render(
      <FlashcardChatPanel
        {...defaultProps}
        pendingPrompt="Build color flashcards"
      />,
    );

    expect(screen.getByText("Build color flashcards")).toBeInTheDocument();
    expect(screen.getByText("You")).toBeInTheDocument();
  });

  it("clears pending prompt once real user messages arrive", () => {
    const onPendingPromptClear = vi.fn();
    mockUseQuery.mockReturnValue([
      { _id: "msg1", role: "user", content: "Build color flashcards" },
    ]);
    render(
      <FlashcardChatPanel
        {...defaultProps}
        pendingPrompt="Build color flashcards"
        onPendingPromptClear={onPendingPromptClear}
      />,
    );

    expect(onPendingPromptClear).toHaveBeenCalled();
  });

  it("shows activity message during generation", () => {
    mockUseQuery.mockReturnValue([]);
    render(
      <FlashcardChatPanel
        {...defaultProps}
        status="generating"
        activityMessage="Generating flashcards..."
      />,
    );

    expect(screen.getByText("Generating flashcards...")).toBeInTheDocument();
  });

  it("shows activity message on failure", () => {
    mockUseQuery.mockReturnValue([]);
    render(
      <FlashcardChatPanel
        {...defaultProps}
        status="failed"
        activityMessage="Generation failed"
      />,
    );

    expect(screen.getByText("Generation failed")).toBeInTheDocument();
  });

  it("submits form and clears input", () => {
    const onSubmit = vi.fn();
    mockUseQuery.mockReturnValue([]);
    render(<FlashcardChatPanel {...defaultProps} onSubmit={onSubmit} />);

    const input = screen.getByLabelText(
      "Describe the flashcards you want to create",
    );
    fireEvent.change(input, { target: { value: "Make animal flashcards" } });
    expect(input).toHaveValue("Make animal flashcards");

    const submitButton = screen.getByLabelText("Create flashcards");
    fireEvent.click(submitButton);

    expect(onSubmit).toHaveBeenCalledWith("Make animal flashcards");
    expect(input).toHaveValue("");
  });

  it("does not submit empty input", () => {
    const onSubmit = vi.fn();
    mockUseQuery.mockReturnValue([]);
    render(<FlashcardChatPanel {...defaultProps} onSubmit={onSubmit} />);

    const submitButton = screen.getByLabelText("Create flashcards");
    expect(submitButton).toBeDisabled();

    fireEvent.click(submitButton);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("disables input and submit button while generating", () => {
    mockUseQuery.mockReturnValue([]);
    render(
      <FlashcardChatPanel
        {...defaultProps}
        status="generating"
        activityMessage="Working..."
      />,
    );

    const input = screen.getByLabelText(
      "Describe the flashcards you want to create",
    );
    expect(input).toBeDisabled();

    const submitButton = screen.getByLabelText("Create flashcards");
    expect(submitButton).toBeDisabled();
  });

  it("skips query when sessionId is null", () => {
    mockUseQuery.mockReturnValue(undefined);
    render(<FlashcardChatPanel {...defaultProps} sessionId={null} />);

    // Verify useQuery was called with "skip"
    expect(mockUseQuery).toHaveBeenCalledWith(
      expect.anything(),
      "skip",
    );
  });
});
