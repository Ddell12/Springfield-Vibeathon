import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ChatMessage } from "../chat-message";

vi.mock("../thinking-state", () => ({
  ThinkingState: ({ status, plan }: { status: string; plan?: string }) => (
    <div data-testid="thinking-state">{status}{plan && <span data-testid="thinking-plan">{plan}</span>}</div>
  ),
}));

vi.mock("../design-plan", () => ({
  DesignPlan: ({ content }: { content: string }) => <div data-testid="design-plan">{content}</div>,
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

  describe("type-based routing", () => {
    it('renders ThinkingState for type="thinking"', () => {
      render(<ChatMessage role="assistant" content="Planning..." type="thinking" />);
      expect(screen.getByTestId("thinking-state")).toBeInTheDocument();
      expect(screen.getByText("Thinking...")).toBeInTheDocument();
      expect(screen.getByTestId("thinking-plan")).toHaveTextContent("Planning...");
    });

    it('renders ThinkingState for type="building"', () => {
      render(<ChatMessage role="assistant" content="Building code" type="building" />);
      expect(screen.getByTestId("thinking-state")).toBeInTheDocument();
      expect(screen.getByText("Building...")).toBeInTheDocument();
    });

    it('renders DesignPlan for type="plan"', () => {
      render(<ChatMessage role="assistant" content="**Design Direction**\n- Blue palette" type="plan" />);
      expect(screen.getByTestId("design-plan")).toBeInTheDocument();
      expect(screen.getByTestId("design-plan")).toHaveTextContent("**Design Direction**");
    });

    it('renders plain text for type="complete"', () => {
      render(<ChatMessage role="assistant" content="Your tool is ready!" type="complete" />);
      expect(screen.queryByTestId("thinking-state")).not.toBeInTheDocument();
      expect(screen.queryByTestId("design-plan")).not.toBeInTheDocument();
      expect(screen.getByText("Your tool is ready!")).toBeInTheDocument();
    });

    it('renders plain text for type="text"', () => {
      render(<ChatMessage role="assistant" content="Hello" type="text" />);
      expect(screen.queryByTestId("thinking-state")).not.toBeInTheDocument();
      expect(screen.getByText("Hello")).toBeInTheDocument();
    });

    it("renders plain text when type is undefined (backwards compat)", () => {
      render(<ChatMessage role="assistant" content="Welcome" />);
      expect(screen.queryByTestId("thinking-state")).not.toBeInTheDocument();
      expect(screen.getByText("Welcome")).toBeInTheDocument();
    });
  });
});
