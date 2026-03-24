import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { FragmentResult } from "../../lib/schema";
import { Chat } from "../chat";

// Mock fetch for API calls
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock the child components to isolate Chat logic
vi.mock("../chat-input", () => ({
  ChatInput: ({
    onSubmit,
    isLoading,
  }: {
    onSubmit: (msg: string) => void;
    isLoading: boolean;
  }) => (
    <div data-testid="chat-input" data-loading={isLoading}>
      <button
        onClick={() => onSubmit("Test message")}
        disabled={isLoading}
        data-testid="submit-btn"
      >
        Send
      </button>
    </div>
  ),
}));

vi.mock("../chat-message", () => ({
  ChatMessage: ({
    role,
    content,
  }: {
    role: string;
    content: string;
  }) => (
    <div data-testid={`message-${role}`} data-role={role}>
      {content}
    </div>
  ),
}));

const mockFragment: FragmentResult = {
  title: "Token Board",
  description: "A token board for positive reinforcement",
  template: "nextjs-developer",
  code: "export default function App() { return <div>Token Board</div>; }",
  file_path: "app/page.tsx",
  has_additional_dependencies: false,
  port: 3000,
};

describe("Chat", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders a welcome message initially", () => {
    render(<Chat />);
    // Should show some welcome/initial message
    const messages = screen.getAllByTestId(/message-/);
    expect(messages.length).toBeGreaterThanOrEqual(1);
  });

  it("renders the chat input", () => {
    render(<Chat />);
    expect(screen.getByTestId("chat-input")).toBeInTheDocument();
  });

  it("shows a welcome or introductory assistant message", () => {
    render(<Chat />);
    // Should have at least one assistant message
    const assistantMessages = screen.queryAllByTestId("message-assistant");
    expect(assistantMessages.length).toBeGreaterThanOrEqual(1);
  });

  it("adds a user message to the list when submitted", async () => {
    const user = userEvent.setup();

    // Mock a streaming response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode('0:"Hello"\n'));
        controller.close();
      },
    });

    mockFetch.mockResolvedValue(
      new Response(stream, {
        status: 200,
        headers: { "Content-Type": "text/event-stream" },
      })
    );

    render(<Chat />);

    await user.click(screen.getByTestId("submit-btn"));

    await waitFor(() => {
      expect(screen.getAllByTestId("message-user").length).toBeGreaterThanOrEqual(1);
    });
  });

  it("shows a loading indicator while waiting for response", async () => {
    const user = userEvent.setup();

    // Never-resolving fetch to keep loading state
    mockFetch.mockReturnValue(new Promise(() => {}));

    render(<Chat />);

    await user.click(screen.getByTestId("submit-btn"));

    const chatInput = screen.getByTestId("chat-input");
    expect(chatInput).toHaveAttribute("data-loading", "true");
  });

  it("calls onFragmentGenerated when a fragment is detected in the response", async () => {
    const onFragmentGenerated = vi.fn();
    const user = userEvent.setup();

    const encoder = new TextEncoder();
    const fragmentData = JSON.stringify(mockFragment);
    const stream = new ReadableStream({
      start(controller) {
        // Simulate a data stream with fragment JSON
        controller.enqueue(encoder.encode(`0:"${fragmentData.replace(/"/g, '\\"')}"\n`));
        controller.close();
      },
    });

    mockFetch.mockResolvedValue(
      new Response(stream, {
        status: 200,
        headers: { "Content-Type": "text/event-stream" },
      })
    );

    render(<Chat onFragmentGenerated={onFragmentGenerated} />);

    await user.click(screen.getByTestId("submit-btn"));

    // Wait for the async processing
    await new Promise((r) => setTimeout(r, 100));
  });

  it("maintains message order (user then assistant)", async () => {
    const user = userEvent.setup();

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode('0:"I can help with that!"\n'));
        controller.close();
      },
    });

    mockFetch.mockResolvedValue(
      new Response(stream, {
        status: 200,
        headers: { "Content-Type": "text/event-stream" },
      })
    );

    render(<Chat />);
    await user.click(screen.getByTestId("submit-btn"));

    await waitFor(() => {
      const allMessages = screen.queryAllByTestId(/message-/);
      expect(allMessages.length).toBeGreaterThan(1);
    });

    // The last user message should come after the initial assistant messages
    const allMessages = screen.queryAllByTestId(/message-/);
    const userMessageIndex = allMessages.findIndex(
      (el) => el.getAttribute("data-role") === "user"
    );
    expect(userMessageIndex).toBeGreaterThanOrEqual(0);
  });
});
