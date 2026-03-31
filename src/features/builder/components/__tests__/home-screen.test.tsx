import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@clerk/nextjs", () => ({
  useUser: () => ({ user: { firstName: "Sam" } }),
}));

vi.mock("@/shared/components/material-icon", () => ({
  MaterialIcon: ({ icon }: { icon: string }) => <span>{icon}</span>,
}));

vi.mock("../input-bar", () => ({
  InputBar: ({
    value,
    onChange,
    onSubmit,
    placeholder,
    showGuidedPill,
    onGuidedClick,
    mode,
    onModeChange,
  }: any) => (
    <div>
      <textarea
        aria-label={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) onSubmit(value);
        }}
      />
      <button onClick={() => onSubmit(value)}>Send</button>
      <button onClick={() => onModeChange?.("app")}>App</button>
      <button onClick={() => onModeChange?.("flashcards")}>Flashcards</button>
      <span>Mode: {mode}</span>
      {showGuidedPill && <button onClick={onGuidedClick}>Guided</button>}
    </div>
  ),
}));

vi.mock("../interview/interview-controller", () => ({
  InterviewController: ({ onEscapeHatch }: any) => (
    <div>
      <span>Interview</span>
      <button onClick={onEscapeHatch}>Back</button>
    </div>
  ),
}));

import { HomeScreen } from "../home-screen";

const baseProps = {
  onGenerate: vi.fn(),
  onModeChange: vi.fn(),
};

describe("HomeScreen", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renders a time-aware greeting with the user's first name", () => {
    render(<HomeScreen {...baseProps} />);
    expect(screen.getByText(/Sam/)).toBeInTheDocument();
    const greeting = screen.getByText(/Good (morning|afternoon|evening), Sam/);
    expect(greeting).toBeInTheDocument();
  });

  it("renders category chips", () => {
    render(<HomeScreen {...baseProps} />);
    expect(screen.getByRole("button", { name: /Communication Board/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Visual Schedule/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Token Board/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Social Story/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Feelings Check-In/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Bridges' choice/i })).toBeInTheDocument();
  });

  it("renders flashcard chips in flashcards mode", () => {
    render(<HomeScreen {...baseProps} mode="flashcards" />);
    expect(screen.getByRole("button", { name: /First Words/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Speech Sounds/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Communication Board/i })).not.toBeInTheDocument();
  });

  it("clicking a category chip pre-fills the textarea", () => {
    render(<HomeScreen {...baseProps} />);
    fireEvent.click(screen.getByRole("button", { name: /Communication Board/i }));
    const textarea = screen.getByRole("textbox");
    expect((textarea as HTMLTextAreaElement).value).toMatch(/communication board/i);
  });

  it("clicking Guided shows the InterviewController", () => {
    render(<HomeScreen {...baseProps} />);
    fireEvent.click(screen.getByRole("button", { name: /Guided/i }));
    expect(screen.getByText("Interview")).toBeInTheDocument();
  });

  it("InterviewController Back button returns to home screen", () => {
    render(<HomeScreen {...baseProps} />);
    fireEvent.click(screen.getByRole("button", { name: /Guided/i }));
    expect(screen.getByText("Interview")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Back/i }));
    expect(screen.queryByText("Interview")).not.toBeInTheDocument();
    expect(screen.getByText(/Good (morning|afternoon|evening), Sam/)).toBeInTheDocument();
  });

  it("hides the guided flow while in flashcards mode", () => {
    render(<HomeScreen {...baseProps} mode="flashcards" />);
    expect(screen.queryByRole("button", { name: /Guided/i })).not.toBeInTheDocument();
  });
});
