import { fireEvent,render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("convex/react", () => ({
  useMutation: vi.fn(() => vi.fn().mockResolvedValue(undefined)),
}));
vi.mock("@convex/_generated/api", () => ({ api: { tools: { logEvent: "tools:logEvent" } } }));

import { MatchingGameRuntime } from "../runtime";
import type { MatchingGameConfig } from "../schema";

const mockOnEvent = vi.fn();

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
      <MatchingGameRuntime config={mockConfig} shareToken="tok" onEvent={mockOnEvent} />
    );
    expect(screen.getByText("Animal Sounds")).toBeInTheDocument();
  });

  it("renders all prompt cards", () => {
    render(
      <MatchingGameRuntime config={mockConfig} shareToken="tok" onEvent={mockOnEvent} />
    );
    expect(screen.getByText("Dog")).toBeInTheDocument();
    expect(screen.getByText("Cat")).toBeInTheDocument();
  });

  it("renders all answer cards", () => {
    render(
      <MatchingGameRuntime config={mockConfig} shareToken="tok" onEvent={mockOnEvent} />
    );
    expect(screen.getByText("Woof")).toBeInTheDocument();
    expect(screen.getByText("Meow")).toBeInTheDocument();
  });

  it("logs answer_correct when correct match is made", () => {
    mockOnEvent.mockClear();
    render(
      <MatchingGameRuntime config={mockConfig} shareToken="tok" onEvent={mockOnEvent} />
    );
    // Select a prompt then its correct answer
    fireEvent.click(screen.getByText("Dog"));
    fireEvent.click(screen.getByText("Woof"));
    expect(mockOnEvent).toHaveBeenCalledWith("answer_correct", expect.any(String));
  });

  it("logs answer_incorrect when wrong match is made", () => {
    mockOnEvent.mockClear();
    render(
      <MatchingGameRuntime config={mockConfig} shareToken="tok" onEvent={mockOnEvent} />
    );
    // Select a prompt then wrong answer
    fireEvent.click(screen.getByText("Dog"));
    fireEvent.click(screen.getByText("Meow"));
    expect(mockOnEvent).toHaveBeenCalledWith("answer_incorrect", expect.any(String));
  });

  it("logs activity_completed when all pairs are matched", () => {
    mockOnEvent.mockClear();
    render(
      <MatchingGameRuntime config={mockConfig} shareToken="tok" onEvent={mockOnEvent} />
    );
    fireEvent.click(screen.getByText("Dog"));
    fireEvent.click(screen.getByText("Woof"));
    fireEvent.click(screen.getByText("Cat"));
    fireEvent.click(screen.getByText("Meow"));
    expect(mockOnEvent).toHaveBeenCalledWith("activity_completed", expect.any(String));
  });
});
