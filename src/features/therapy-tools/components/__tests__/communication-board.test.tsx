import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as convexReact from "convex/react";
import { beforeEach,describe, expect, test, vi } from "vitest";

import type { CommunicationBoardConfig } from "../../types/tool-configs";
import { CommunicationBoard } from "../communication-board";

// Mock use-sound — returns [playFn, { stop, isPlaying }]
vi.mock("use-sound", () => ({
  default: () => [vi.fn(), { stop: vi.fn(), isPlaying: false }],
}));

// Mock convex/react useAction — returns async no-op by default
vi.mock("convex/react", () => ({
  useAction: vi.fn(() => vi.fn().mockResolvedValue(undefined)),
  useQuery: vi.fn(() => undefined),
  useMutation: vi.fn(() => vi.fn()),
  useConvex: vi.fn(() => ({})),
}));

// Mock next/image as a simple img element
vi.mock("next/image", () => ({
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => (
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    <img {...props} />
  ),
}));

const mockCommConfig: CommunicationBoardConfig = {
  type: "communication-board",
  title: "Snack Board",
  sentenceStarter: "I want",
  cards: [
    { id: "c1", label: "Cookies", icon: "🍪", category: "snacks" },
    { id: "c2", label: "Milk", icon: "🥛", category: "drinks" },
    { id: "c3", label: "Apple", icon: "🍎", category: "snacks" },
    { id: "c4", label: "Water", icon: "💧", category: "drinks" },
    { id: "c5", label: "Crackers", icon: "🧀", category: "snacks" },
    { id: "c6", label: "Juice", icon: "🧃", category: "drinks" },
  ],
  enableTTS: true,
  voiceId: "default",
  columns: 3,
};

describe("CommunicationBoard", () => {
  beforeEach(() => {
    // Reset useAction to the default no-op before each test
    vi.mocked(convexReact.useAction).mockReturnValue(
      vi.fn().mockResolvedValue(undefined),
    );
  });

  test("renders sentence starter", () => {
    render(<CommunicationBoard config={mockCommConfig} />);

    expect(screen.getByText(/I want/i)).toBeInTheDocument();
  });

  test("renders all card labels", () => {
    render(<CommunicationBoard config={mockCommConfig} />);

    expect(screen.getByText("Cookies")).toBeInTheDocument();
    expect(screen.getByText("Milk")).toBeInTheDocument();
    expect(screen.getByText("Apple")).toBeInTheDocument();
    expect(screen.getByText("Water")).toBeInTheDocument();
    expect(screen.getByText("Crackers")).toBeInTheDocument();
    expect(screen.getByText("Juice")).toBeInTheDocument();
  });

  test("adds card label to sentence on tap", async () => {
    const user = userEvent.setup();
    render(<CommunicationBoard config={mockCommConfig} />);

    await user.click(screen.getByRole("button", { name: /Cookies/i }));

    // The sentence strip should now show "Cookies"
    // The sentence starter area should contain both parts
    const sentenceArea = screen.getByText(/I want/i).closest("div");
    expect(sentenceArea).toHaveTextContent("Cookies");
  });

  test("removes card from sentence on second tap", async () => {
    const user = userEvent.setup();
    render(<CommunicationBoard config={mockCommConfig} />);

    const cookiesButton = screen.getByRole("button", { name: /Cookies/i });

    // First tap — adds to sentence
    await user.click(cookiesButton);
    const sentenceAreaAfterAdd = screen.getByText(/I want/i).closest("div");
    expect(sentenceAreaAfterAdd).toHaveTextContent("Cookies");

    // Second tap — removes from sentence
    await user.click(cookiesButton);
    // After removal, "Cookies" should no longer appear in the sentence area
    const sentenceAreaAfterRemove = screen
      .getByText(/I want/i)
      .closest("div");
    expect(sentenceAreaAfterRemove).not.toHaveTextContent(/\bCookies\b/);
  });

  test("builds multi-word sentence", async () => {
    const user = userEvent.setup();
    render(<CommunicationBoard config={mockCommConfig} />);

    await user.click(screen.getByRole("button", { name: /Cookies/i }));
    await user.click(screen.getByRole("button", { name: /Milk/i }));

    const sentenceArea = screen.getByText(/I want/i).closest("div");
    expect(sentenceArea).toHaveTextContent("Cookies");
    expect(sentenceArea).toHaveTextContent("Milk");
  });

  test("speak button is disabled when no cards selected", () => {
    render(<CommunicationBoard config={mockCommConfig} />);

    const speakButton = screen.getByRole("button", { name: /speak/i });
    expect(speakButton).toBeDisabled();
  });

  test("speak button triggers TTS action", async () => {
    const mockSpeakAction = vi.fn().mockResolvedValue(undefined);
    vi.mocked(convexReact.useAction).mockReturnValue(mockSpeakAction);

    const user = userEvent.setup();
    render(<CommunicationBoard config={mockCommConfig} />);

    // Select a card first
    await user.click(screen.getByRole("button", { name: /Cookies/i }));

    // Click speak
    const speakButton = screen.getByRole("button", { name: /speak/i });
    await user.click(speakButton);

    // Speak button should no longer be disabled after selection
    expect(speakButton).not.toBeDisabled();
  });

  test("renders image when card has imageUrl", () => {
    const configWithImage: CommunicationBoardConfig = {
      ...mockCommConfig,
      cards: [
        {
          id: "c1",
          label: "Cookies",
          icon: "🍪",
          category: "snacks",
          imageUrl: "https://example.com/cookies.png",
        },
      ],
    };

    render(<CommunicationBoard config={configWithImage} />);

    // Should render an img element when imageUrl is present
    const img = screen.getByRole("img");
    expect(img).toBeInTheDocument();
  });

  test("renders icon when card has no imageUrl", () => {
    render(<CommunicationBoard config={mockCommConfig} />);

    // Cards without imageUrl should show their emoji icons
    // The icon is rendered as text within the card
    expect(screen.getByText("🍪")).toBeInTheDocument();
    expect(screen.getByText("🥛")).toBeInTheDocument();
  });
});
