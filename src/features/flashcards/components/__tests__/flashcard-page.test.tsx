import { fireEvent,render, screen } from "@testing-library/react";

import { FlashcardPage } from "../flashcard-page";

const mockGenerate = vi.fn();
const mockReset = vi.fn();
const mockUseFlashcardStreaming = vi.fn();
const mockUseQuery = vi.fn();

vi.mock("next/navigation", () => ({
  usePathname: () => "/flashcards",
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock("convex/react", () => ({
  useMutation: () => vi.fn().mockResolvedValue(undefined),
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
}));
vi.mock("../../hooks/use-flashcard-streaming", () => ({
  useFlashcardStreaming: () => mockUseFlashcardStreaming(),
}));
vi.mock("@/core/hooks/use-mobile", () => ({
  useIsMobile: () => false,
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/shared/components/material-icon", () => ({
  MaterialIcon: ({ icon }: { icon: string }) => <span>{icon}</span>,
}));
vi.mock("@/shared/components/suggestion-chips", () => ({
  SuggestionChips: ({ suggestions, onSelect }: any) => (
    <div data-testid="suggestion-chips">
      {suggestions.map((s: string) => (
        <button key={s} onClick={() => onSelect(s)}>{s}</button>
      ))}
    </div>
  ),
}));
vi.mock("@/shared/components/delete-confirmation-dialog", () => ({
  DeleteConfirmationDialog: () => null,
}));
vi.mock("../deck-list", () => ({
  DeckList: () => <div data-testid="deck-list">Decks</div>,
}));
vi.mock("../flashcard-chat-panel", () => ({
  FlashcardChatPanel: ({ onSubmit }: any) => (
    <div data-testid="chat-panel">
      <button onClick={() => onSubmit("test prompt")}>Submit</button>
    </div>
  ),
}));
vi.mock("../flashcard-preview-panel", () => ({
  FlashcardPreviewPanel: () => <div data-testid="preview-panel">Preview</div>,
}));
vi.mock("../flashcard-toolbar", () => ({
  FlashcardToolbar: ({ projectName, onNewChat, onSave }: any) => (
    <div data-testid="toolbar">
      <span>{projectName}</span>
      <button onClick={onNewChat}>New Chat</button>
      <button onClick={onSave}>Save</button>
    </div>
  ),
}));
vi.mock("../rename-deck-dialog", () => ({
  RenameDeckDialog: () => null,
}));

describe("FlashcardPage", () => {
  beforeEach(() => {
    mockUseQuery.mockReturnValue(undefined);
  });

  it("shows prompt screen when idle with no session", () => {
    mockUseFlashcardStreaming.mockReturnValue({
      status: "idle",
      sessionId: null,
      activityMessage: "",
      generate: mockGenerate,
      reset: mockReset,
    });
    render(<FlashcardPage />);

    expect(screen.getByText("What flashcards would you like to create?")).toBeInTheDocument();
    expect(screen.getByLabelText("Describe the flashcards you want to create")).toBeInTheDocument();
    expect(screen.getByTestId("suggestion-chips")).toBeInTheDocument();
  });

  it("submits prompt from input field", () => {
    mockUseFlashcardStreaming.mockReturnValue({
      status: "idle",
      sessionId: null,
      activityMessage: "",
      generate: mockGenerate,
      reset: mockReset,
    });
    render(<FlashcardPage />);

    const input = screen.getByLabelText("Describe the flashcards you want to create");
    fireEvent.change(input, { target: { value: "animal sounds" } });
    fireEvent.click(screen.getByLabelText("Generate flashcards"));

    expect(mockGenerate).toHaveBeenCalledWith("animal sounds");
  });

  it("submits prompt from suggestion chip", () => {
    mockUseFlashcardStreaming.mockReturnValue({
      status: "idle",
      sessionId: null,
      activityMessage: "",
      generate: mockGenerate,
      reset: mockReset,
    });
    render(<FlashcardPage />);

    const firstSuggestion = "Make flashcards for basic colors like red, blue, green, yellow";
    fireEvent.click(screen.getByText(firstSuggestion));
    expect(mockGenerate).toHaveBeenCalledWith(firstSuggestion);
  });

  it("shows toolbar and panels when session exists", () => {
    mockUseFlashcardStreaming.mockReturnValue({
      status: "generating",
      sessionId: "sess_1",
      activityMessage: "Working...",
      generate: mockGenerate,
      reset: mockReset,
    });
    render(<FlashcardPage />);

    expect(screen.getByTestId("toolbar")).toBeInTheDocument();
    expect(screen.getByTestId("chat-panel")).toBeInTheDocument();
    expect(screen.getByTestId("preview-panel")).toBeInTheDocument();
  });

  it("does not show prompt screen when session active", () => {
    mockUseFlashcardStreaming.mockReturnValue({
      status: "live",
      sessionId: "sess_1",
      activityMessage: "",
      generate: mockGenerate,
      reset: mockReset,
    });
    render(<FlashcardPage />);

    expect(screen.queryByText("What flashcards would you like to create?")).not.toBeInTheDocument();
  });

  it("disable submit button when input is empty", () => {
    mockUseFlashcardStreaming.mockReturnValue({
      status: "idle",
      sessionId: null,
      activityMessage: "",
      generate: mockGenerate,
      reset: mockReset,
    });
    render(<FlashcardPage />);

    const submitButton = screen.getByLabelText("Generate flashcards");
    expect(submitButton).toBeDisabled();
  });
});
