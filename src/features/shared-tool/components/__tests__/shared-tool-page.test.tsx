import { render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";

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

// Mock MaterialIcon to avoid font-loading issues
vi.mock("@/shared/components/material-icon", () => ({
  MaterialIcon: ({ icon }: { icon: string }) => (
    <span data-testid={`icon-${icon}`} />
  ),
}));

import * as convexReact from "convex/react";

import { SharedToolPage } from "../shared-tool-page";

const mockProject = {
  _id: "project1",
  _creationTime: Date.now(),
  title: "Emma's Feelings Board",
  description: "Tap an emoji to express how you're feeling today",
  shareSlug: "abc123",
  sessionId: "session123",
  fragment: {
    title: "Emma's Feelings Board",
    description: "Feelings board",
    template: "nextjs-developer",
    code: "export default function App() { return <div>Feelings Board</div>; }",
    file_path: "app/page.tsx",
    has_additional_dependencies: false,
    port: 3000,
  },
  createdAt: Date.now(),
  updatedAt: Date.now(),
};

describe("SharedToolPage", () => {
  test("shows loading state when getBySlug returns undefined", () => {
    vi.mocked(convexReact.useQuery).mockReturnValue(undefined);

    render(<SharedToolPage />);

    // Loading state: loading skeleton should be present
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
    // Should have a link to the builder
    const builderLink = screen.getByRole("link", { name: /build|create|builder/i });
    expect(builderLink).toHaveAttribute("href", "/builder");
  });

  test("renders project title when project data is returned", () => {
    vi.mocked(convexReact.useQuery).mockReturnValue(mockProject);

    render(<SharedToolPage />);

    expect(screen.getByText("Emma's Feelings Board")).toBeInTheDocument();
  });

  test("not-found state shows Build your own CTA", () => {
    vi.mocked(convexReact.useQuery).mockReturnValue(null);

    render(<SharedToolPage />);

    // CTA link should be present
    const ctaLinks = screen.getAllByRole("link", { name: /build your own|create|builder/i });
    expect(ctaLinks.length).toBeGreaterThanOrEqual(1);
    expect(ctaLinks[0]).toHaveAttribute("href", "/builder");
  });

  test("renders iframe with /api/tool/{slug} src when app exists", () => {
    vi.mocked(convexReact.useQuery).mockReturnValue({
      ...mockProject,
      sessionId: "session123",
    });

    render(<SharedToolPage />);

    const iframe = document.querySelector("iframe");
    expect(iframe).not.toBeNull();
    expect(iframe?.getAttribute("src")).toBe("/api/tool/abc123");
  });
});
