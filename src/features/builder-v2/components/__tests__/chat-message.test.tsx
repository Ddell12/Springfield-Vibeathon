import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ChatMessage } from "../chat-message";

vi.mock("../thinking-state", () => ({
  ThinkingState: ({ status }: { status: string }) => <div data-testid="thinking-state">{status}</div>,
}));

describe("ChatMessage", () => {
  it("renders user message content", () => {
    render(<ChatMessage role="user" content="Build a token board" />);
    expect(screen.getByText("Build a token board")).toBeInTheDocument();
  });

  it("renders assistant message content", () => {
    render(
      <ChatMessage
        role="assistant"
        content="I'll help you build a token board for positive reinforcement."
      />
    );
    expect(
      screen.getByText("I'll help you build a token board for positive reinforcement.")
    ).toBeInTheDocument();
  });

  it("applies distinct styling for user vs assistant messages", () => {
    const { container: userContainer } = render(
      <ChatMessage role="user" content="User message" />
    );
    const { container: assistantContainer } = render(
      <ChatMessage role="assistant" content="Assistant message" />
    );

    // The containers should have different className/structure
    expect(userContainer.innerHTML).not.toBe(assistantContainer.innerHTML);
  });

  it("renders user messages with distinct background styling", () => {
    render(<ChatMessage role="user" content="Hello from user" />);
    const bubble = screen.getByText("Hello from user").closest("[class]");
    // User messages have a colored background bubble
    expect(bubble?.className).toMatch(/bg-/);
  });

  it("renders assistant messages as plain text", () => {
    render(<ChatMessage role="assistant" content="Hello from assistant" />);
    const message = screen.getByText("Hello from assistant");
    expect(message).toBeInTheDocument();
  });

  it("renders multi-line content correctly", () => {
    const multiLine = "First paragraph\n\nSecond paragraph";
    render(<ChatMessage role="assistant" content={multiLine} />);
    // The content should be present in the DOM
    expect(screen.getByText(/First paragraph/)).toBeInTheDocument();
  });

  it("renders with an accessible role or structure", () => {
    const { container } = render(
      <ChatMessage role="user" content="Accessible message" />
    );
    expect(container.firstChild).toBeInTheDocument();
  });
});
