import { render, screen } from "@testing-library/react";
import { describe, test, expect, vi } from "vitest";

// Mock convex/react — useQuery is the main seam for this component
vi.mock("convex/react", () => ({
  useQuery: vi.fn(),
}));

// Mock next/navigation — component reads the slug from URL params
vi.mock("next/navigation", () => ({
  useParams: () => ({ toolId: "abc123" }),
}));

// Mock next/link as plain anchor
vi.mock("next/link", () => ({
  default: ({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) => <a href={href}>{children}</a>,
}));

// Mock ToolRenderer to avoid rendering tool internals
vi.mock("@/features/therapy-tools/components/tool-renderer", () => ({
  ToolRenderer: (props: { config: unknown }) => (
    <div data-testid="tool-renderer" data-config={JSON.stringify(props.config)} />
  ),
}));

// Mock MaterialIcon to avoid font-loading issues
vi.mock("@/shared/components/material-icon", () => ({
  MaterialIcon: ({ icon }: { icon: string }) => (
    <span data-testid={`icon-${icon}`} />
  ),
}));

// Mock motion to avoid animation side effects
vi.mock("motion/react", () => ({
  motion: {
    div: ({ children, ...rest }: React.HTMLAttributes<HTMLDivElement>) => (
      <div {...rest}>{children}</div>
    ),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));

import * as convexReact from "convex/react";
import { SharedToolPage } from "../shared-tool-page";

const mockTool = {
  _id: "tool1",
  _creationTime: Date.now(),
  title: "Emma's Feelings Board",
  description: "Tap an emoji to express how you're feeling today",
  toolType: "communication-board",
  config: {
    type: "communication-board",
    title: "Emma's Feelings Board",
    sentenceStarter: "I FEEL",
    cards: [],
    enableTTS: false,
    voiceId: "default",
    columns: 3,
  },
  shareSlug: "abc123",
  isTemplate: false,
  createdAt: Date.now(),
  updatedAt: Date.now(),
};

describe("SharedToolPage", () => {
  test("shows loading state when getBySlug returns undefined", () => {
    vi.mocked(convexReact.useQuery).mockReturnValue(undefined);

    render(<SharedToolPage />);

    // Loading state: tool renderer should not be visible yet
    expect(screen.queryByTestId("tool-renderer")).not.toBeInTheDocument();
    // A loading indicator should be present
    const loadingEl =
      screen.queryByRole("status") ||
      screen.queryByText(/loading/i) ||
      document.querySelector(".animate-pulse") ||
      document.querySelector("[data-testid='loading-skeleton']");
    expect(loadingEl).not.toBeNull();
  });

  test("shows not-found state with link to /builder when getBySlug returns null", () => {
    vi.mocked(convexReact.useQuery).mockReturnValue(null);

    render(<SharedToolPage />);

    // Not-found state should be shown
    expect(screen.queryByTestId("tool-renderer")).not.toBeInTheDocument();
    // Should have a link to the builder
    const builderLink = screen.getByRole("link", { name: /build|create|builder/i });
    expect(builderLink).toHaveAttribute("href", "/builder");
  });

  test("renders tool title and tool renderer when tool data is returned", () => {
    vi.mocked(convexReact.useQuery).mockReturnValue(mockTool);

    render(<SharedToolPage />);

    expect(screen.getByText("Emma's Feelings Board")).toBeInTheDocument();
    expect(screen.getByTestId("tool-renderer")).toBeInTheDocument();
  });

  test("not-found state shows Build your own CTA", () => {
    vi.mocked(convexReact.useQuery).mockReturnValue(null);

    render(<SharedToolPage />);

    // CTA text should reference building a tool
    expect(
      screen.getByText(/build your own|create your own|not found|tool not found/i),
    ).toBeInTheDocument();
  });
});
