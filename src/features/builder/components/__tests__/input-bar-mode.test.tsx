import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { InputBar } from "../input-bar";

vi.mock("@/shared/components/voice-input", () => ({
  VoiceInput: () => <button type="button">Voice</button>,
}));
vi.mock("@/shared/components/material-icon", () => ({
  MaterialIcon: ({ icon }: any) => <span>{icon}</span>,
}));

describe("InputBar mode picker", () => {
  it("renders App and Flashcards mode buttons", () => {
    render(
      <InputBar
        value="" onChange={vi.fn()} onSubmit={vi.fn()}
        isGenerating={false} mode="app" onModeChange={vi.fn()}
      />
    );
    expect(screen.getByRole("button", { name: /app/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /flashcards/i })).toBeInTheDocument();
  });
  it("calls onModeChange with 'flashcards' when Flashcards clicked", () => {
    const onModeChange = vi.fn();
    render(
      <InputBar
        value="" onChange={vi.fn()} onSubmit={vi.fn()}
        isGenerating={false} mode="app" onModeChange={onModeChange}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: /flashcards/i }));
    expect(onModeChange).toHaveBeenCalledWith("flashcards");
  });
  it("hides mode picker when isGenerating is true", () => {
    render(
      <InputBar
        value="" onChange={vi.fn()} onSubmit={vi.fn()}
        isGenerating={true} mode="app" onModeChange={vi.fn()}
      />
    );
    expect(screen.queryByRole("button", { name: /flashcards/i })).not.toBeInTheDocument();
  });
  it("changes placeholder text in flashcards mode", () => {
    render(
      <InputBar
        value="" onChange={vi.fn()} onSubmit={vi.fn()}
        isGenerating={false} mode="flashcards" onModeChange={vi.fn()}
      />
    );
    expect(screen.getByPlaceholderText(/describe the flashcard set/i)).toBeInTheDocument();
  });
});
