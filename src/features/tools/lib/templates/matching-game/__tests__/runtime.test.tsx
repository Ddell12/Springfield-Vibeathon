import { fireEvent,render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";

vi.mock("convex/react", () => ({
  useMutation: vi.fn(() => vi.fn().mockResolvedValue(undefined)),
}));
vi.mock("@convex/_generated/api", () => ({ api: { tools: { logEvent: "tools:logEvent" } } }));

import { ShellStateContext } from "../../../../lib/runtime/shell-state-context";
import { MatchingGameRuntime } from "../runtime";
import type { MatchingGameConfig } from "../schema";

const mockOnEvent = vi.fn();
const mockVoice = { speak: vi.fn(), stop: vi.fn(), status: "idle" as const };

const mockConfig: MatchingGameConfig = {
  title: "Animal Sounds",
  pairs: [
    { id: "1", prompt: "Dog", answer: "Woof" },
    { id: "2", prompt: "Cat", answer: "Meow" },
  ],
  showAnswerImages: false,
  celebrateCorrect: true,
  highContrast: false,
};

describe("MatchingGameRuntime", () => {
  it("renders the title", () => {
    render(
      <MatchingGameRuntime
        config={mockConfig}
        mode="preview"
        onEvent={mockOnEvent}
        voice={mockVoice}
      />
    );
    expect(screen.getByText("Animal Sounds")).toBeInTheDocument();
  });

  it("renders all prompt cards", () => {
    render(
      <MatchingGameRuntime
        config={mockConfig}
        mode="preview"
        onEvent={mockOnEvent}
        voice={mockVoice}
      />
    );
    expect(screen.getByText("Dog")).toBeInTheDocument();
    expect(screen.getByText("Cat")).toBeInTheDocument();
  });

  it("renders all answer cards", () => {
    render(
      <MatchingGameRuntime
        config={mockConfig}
        mode="preview"
        onEvent={mockOnEvent}
        voice={mockVoice}
      />
    );
    expect(screen.getByText("Woof")).toBeInTheDocument();
    expect(screen.getByText("Meow")).toBeInTheDocument();
  });

  it("logs answer_correct when correct match is made", () => {
    mockOnEvent.mockClear();
    render(
      <MatchingGameRuntime
        config={mockConfig}
        mode="preview"
        onEvent={mockOnEvent}
        voice={mockVoice}
      />
    );
    // Select a prompt then its correct answer
    fireEvent.click(screen.getByText("Dog"));
    fireEvent.click(screen.getByText("Woof"));
    expect(mockOnEvent).toHaveBeenCalledWith("answer_correct", expect.any(String));
  });

  it("logs answer_incorrect when wrong match is made", () => {
    mockOnEvent.mockClear();
    render(
      <MatchingGameRuntime
        config={mockConfig}
        mode="preview"
        onEvent={mockOnEvent}
        voice={mockVoice}
      />
    );
    // Select a prompt then wrong answer
    fireEvent.click(screen.getByText("Dog"));
    fireEvent.click(screen.getByText("Meow"));
    expect(mockOnEvent).toHaveBeenCalledWith("answer_incorrect", expect.any(String));
  });

  it("logs activity_completed when all pairs are matched", () => {
    mockOnEvent.mockClear();
    render(
      <MatchingGameRuntime
        config={mockConfig}
        mode="preview"
        onEvent={mockOnEvent}
        voice={mockVoice}
      />
    );
    fireEvent.click(screen.getByText("Dog"));
    fireEvent.click(screen.getByText("Woof"));
    fireEvent.click(screen.getByText("Cat"));
    fireEvent.click(screen.getByText("Meow"));
    expect(mockOnEvent).toHaveBeenCalledWith("activity_completed", expect.any(String));
  });
});

const voice = { speak: vi.fn(), stop: vi.fn(), status: "idle" as const };
const onEvent = vi.fn();
const config = {
  title: "Animals",
  pairs: [
    { id: "1", prompt: "Dog", answer: "Woof" },
    { id: "2", prompt: "Cat", answer: "Meow" },
    { id: "3", prompt: "Cow", answer: "Moo" },
    { id: "4", prompt: "Duck", answer: "Quack" },
    { id: "5", prompt: "Pig", answer: "Oink" },
  ],
  showAnswerImages: false, celebrateCorrect: true, highContrast: false,
};

function withDifficulty(difficulty: "easy" | "medium" | "hard") {
  return render(
    <ShellStateContext.Provider value={{ difficulty, soundsEnabled: true }}>
      <MatchingGameRuntime config={config} mode="preview" onEvent={onEvent} voice={voice} />
    </ShellStateContext.Provider>
  );
}

describe("MatchingGameRuntime — difficulty slicing", () => {
  it("shows 2 pairs on easy", () => {
    withDifficulty("easy");
    expect(screen.getByText("Dog")).toBeInTheDocument();
    expect(screen.getByText("Cat")).toBeInTheDocument();
    expect(screen.queryByText("Cow")).not.toBeInTheDocument();
  });

  it("shows 4 pairs on medium", () => {
    withDifficulty("medium");
    expect(screen.getByText("Duck")).toBeInTheDocument();
    expect(screen.queryByText("Pig")).not.toBeInTheDocument();
  });

  it("shows all pairs on hard", () => {
    withDifficulty("hard");
    expect(screen.getByText("Pig")).toBeInTheDocument();
  });
});

describe("MatchingGameRuntime — promptImageUrl", () => {
  it("renders prompt image when promptImageUrl is set", () => {
    const cfg = { ...config, pairs: [{ id: "1", prompt: "Dog", answer: "Woof", promptImageUrl: "https://ex.com/dog.jpg" }] };
    render(
      <ShellStateContext.Provider value={{ difficulty: "hard", soundsEnabled: true }}>
        <MatchingGameRuntime config={cfg} mode="preview" onEvent={onEvent} voice={voice} />
      </ShellStateContext.Provider>
    );
    expect(screen.getByAltText("Dog")).toHaveAttribute("src", "https://ex.com/dog.jpg");
  });
});
