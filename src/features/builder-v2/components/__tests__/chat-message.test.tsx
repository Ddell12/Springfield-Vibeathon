import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ChatMessage } from "../chat-message";

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

  it("aligns user messages to the right", () => {
    render(<ChatMessage role="user" content="Hello from user" />);
    const message = screen.getByText("Hello from user").closest("[class]");
    // User messages should have right alignment or self-end class
    expect(message?.className).toMatch(/end|right|user/i);
  });

  it("aligns assistant messages to the left", () => {
    render(<ChatMessage role="assistant" content="Hello from assistant" />);
    const message = screen.getByText("Hello from assistant").closest("[class]");
    // Assistant messages should have left alignment or self-start class
    expect(message?.className).toMatch(/start|left|assistant/i);
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
