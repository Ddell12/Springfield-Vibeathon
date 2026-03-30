import { Suspense } from "react";
import { render, screen, act } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MessageThread } from "../message-thread";

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock("@clerk/nextjs", () => ({
  useUser: () => ({
    user: { id: "user1", fullName: "Test Therapist" },
    isLoaded: true,
    isSignedIn: true,
  }),
}));

vi.mock("@/core/utils", () => ({
  cn: (...classes: any[]) => classes.filter(Boolean).join(" "),
}));

vi.mock("@/shared/components/ui/button", () => ({
  Button: ({ children, onClick, disabled, ...props }: any) => (
    <button onClick={onClick} disabled={disabled} {...props}>
      {children}
    </button>
  ),
}));

vi.mock("@/shared/components/ui/input", () => ({
  Input: (props: any) => <input {...props} />,
}));

vi.mock("sonner", () => ({
  toast: { error: vi.fn() },
}));

vi.mock("lucide-react", () => ({
  ArrowLeft: () => <span data-testid="arrow-left-icon" />,
  Send: () => <span data-testid="send-icon" />,
}));

const mockMessages = vi.fn();
const mockSendMessage = vi.fn();
const mockMarkRead = vi.fn(() => Promise.resolve());

vi.mock("../../hooks/use-messages", () => ({
  useMessages: () => ({
    messages: mockMessages(),
    sendMessage: mockSendMessage,
    markRead: mockMarkRead,
  }),
}));

vi.mock("../message-bubble", () => ({
  MessageBubble: ({ content }: any) => (
    <div data-testid="message-bubble">{content}</div>
  ),
}));

async function renderThread(patientId = "patient1") {
  const paramsPromise = Promise.resolve({ patientId });
  let result: ReturnType<typeof render>;
  await act(async () => {
    result = render(
      <Suspense fallback={<div>Suspense loading</div>}>
        <MessageThread paramsPromise={paramsPromise} />
      </Suspense>
    );
  });
  return result!;
}

// jsdom doesn't implement scrollIntoView
Element.prototype.scrollIntoView = vi.fn();

describe("MessageThread", () => {
  it("shows loading state when messages is undefined", async () => {
    mockMessages.mockReturnValue(undefined);
    await renderThread();
    expect(screen.getByText(/Loading messages/)).toBeInTheDocument();
  });

  it("shows empty state when messages array is empty", async () => {
    mockMessages.mockReturnValue([]);
    await renderThread();
    expect(screen.getByText(/No messages yet/)).toBeInTheDocument();
  });

  it("renders message bubbles when messages exist", async () => {
    mockMessages.mockReturnValue([
      {
        _id: "msg1",
        content: "Hello from therapist",
        senderUserId: "user1",
        senderRole: "slp",
        timestamp: Date.now(),
      },
      {
        _id: "msg2",
        content: "Thanks for the update",
        senderUserId: "user2",
        senderRole: "caregiver",
        timestamp: Date.now() + 1000,
      },
    ]);
    await renderThread();
    const bubbles = screen.getAllByTestId("message-bubble");
    expect(bubbles).toHaveLength(2);
  });

  it("renders message input field", async () => {
    mockMessages.mockReturnValue([]);
    await renderThread();
    expect(screen.getByRole("textbox", { name: /Message input/ })).toBeInTheDocument();
  });

  it("renders send button", async () => {
    mockMessages.mockReturnValue([]);
    await renderThread();
    expect(screen.getByRole("button", { name: /Send message/ })).toBeInTheDocument();
  });

  it("renders Messages heading", async () => {
    mockMessages.mockReturnValue([]);
    await renderThread();
    expect(screen.getByText("Messages")).toBeInTheDocument();
  });
});
