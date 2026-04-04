import { render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";

// Mock convex/react — useQuery is the main seam for this component
vi.mock("convex/react", () => ({
  useQuery: vi.fn(),
  useMutation: vi.fn(() => vi.fn()),
}));

// Mock next/navigation — component reads the slug from URL params
vi.mock("next/navigation", () => ({
  useParams: () => ({ toolId: "4cb10199-5417-46d0-b00e-a3366f11b74c" }),
  useSearchParams: () => new URLSearchParams(),
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

// Mock ToolRuntimePage to isolate SharedToolPage tests
vi.mock("@/features/tools/components/runtime/tool-runtime-page", () => ({
  ToolRuntimePage: (props: { shareToken: string; templateType: string; configJson: string }) => (
    <div data-testid="tool-runtime" data-share-token={props.shareToken} data-template-type={props.templateType}>
      Runtime: {props.templateType}
    </div>
  ),
}));

import * as convexReact from "convex/react";

import { SharedToolPage } from "../shared-tool-page";

const mockResult = {
  instance: {
    _id: "qx79hnypcfy3vxcvkrnnpcexvn846806",
    _creationTime: Date.now(),
    templateType: "token_board",
    title: "Dinosaur Stars",
    titleLower: "dinosaur stars",
    slpUserId: "s579a5emg",
    status: "published" as const,
    version: 2,
    shareToken: "4cb10199-5417-46d0-b00e-a3366f11b74c",
    publishedAt: Date.now(),
    configJson: '{"title":"Dinosaur Stars","tokenCount":7}',
  },
  configJson: '{"title":"Dinosaur Stars","tokenCount":7,"rewardLabel":"10 min iPad time","tokenShape":"star","tokenColor":"#FBBF24","highContrast":false}',
};

describe("SharedToolPage", () => {
  test("shows loading skeleton when query returns undefined", () => {
    vi.mocked(convexReact.useQuery).mockReturnValue(undefined);

    render(<SharedToolPage />);

    const loadingEl = document.querySelector("[data-testid='loading-skeleton']");
    expect(loadingEl).not.toBeNull();
  });

  test("shows not-found state with link to /builder when query returns null", () => {
    vi.mocked(convexReact.useQuery).mockReturnValue(null);

    render(<SharedToolPage />);

    const builderLink = screen.getByRole("link", { name: /build your own/i });
    expect(builderLink).toHaveAttribute("href", "/builder");
  });

  test("renders ToolRuntimePage with correct props when tool is found", () => {
    vi.mocked(convexReact.useQuery).mockReturnValue(mockResult);

    render(<SharedToolPage />);

    const runtime = screen.getByTestId("tool-runtime");
    expect(runtime).toBeInTheDocument();
    expect(runtime).toHaveAttribute("data-share-token", "4cb10199-5417-46d0-b00e-a3366f11b74c");
    expect(runtime).toHaveAttribute("data-template-type", "token_board");
  });

  test("not-found state shows Build Your Own CTA", () => {
    vi.mocked(convexReact.useQuery).mockReturnValue(null);

    render(<SharedToolPage />);

    const ctaLinks = screen.getAllByRole("link", { name: /build your own|create/i });
    expect(ctaLinks.length).toBeGreaterThanOrEqual(1);
    expect(ctaLinks[0]).toHaveAttribute("href", "/builder");
  });

  test("shows Vocali CTA footer when tool renders", () => {
    vi.mocked(convexReact.useQuery).mockReturnValue(mockResult);

    render(<SharedToolPage />);

    expect(screen.getByText(/build your own/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /create tool/i })).toHaveAttribute("href", "/builder");
  });
});
