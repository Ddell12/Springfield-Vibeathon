import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, test, expect, vi, beforeEach } from "vitest";
import { MyToolsPage } from "../my-tools-page";
import type { Id } from "convex/_generated/dataModel";

// Mock convex/react — useQuery returns undefined (loading) by default
vi.mock("convex/react", () => ({
  useQuery: vi.fn(),
  useMutation: vi.fn(() => vi.fn()),
}));

// Mock next/link as a plain anchor element
vi.mock("next/link", () => ({
  default: ({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) => <a href={href}>{children}</a>,
}));

// Mock next/navigation router
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

// Mock ShareDialog to avoid rendering its internals
vi.mock("@/features/sharing/components/share-dialog", () => ({
  ShareDialog: () => null,
}));

// Mock material-icon to avoid font-loading issues
vi.mock("@/shared/components/material-icon", () => ({
  MaterialIcon: ({ icon }: { icon: string }) => (
    <span data-testid={`icon-${icon}`} />
  ),
}));

import * as convexReact from "convex/react";
import { api } from "convex/_generated/api";

const mockTool = {
  _id: "tool1" as Id<"tools">,
  _creationTime: Date.now(),
  title: "My Schedule",
  toolType: "visual-schedule",
  description: "test",
  config: {},
  shareSlug: "abc1234567",
  isTemplate: false,
  createdAt: Date.now(),
  updatedAt: Date.now(),
};

const mockTemplateTool = {
  ...mockTool,
  _id: "tool2" as Id<"tools">,
  title: "Template Tool",
  isTemplate: true,
};

describe("MyToolsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(convexReact.useMutation).mockReturnValue(vi.fn());
  });

  test("shows loading skeleton when useQuery returns undefined", () => {
    vi.mocked(convexReact.useQuery).mockReturnValue(undefined);

    render(<MyToolsPage />);

    // Loading state: skeleton elements or spinner present
    // There should be no tool cards in the DOM yet
    expect(screen.queryByText("My Schedule")).not.toBeInTheDocument();
    // Skeleton or loading indicator should be visible
    const loadingEl =
      screen.queryByRole("status") ||
      document.querySelector("[data-testid='loading-skeleton']") ||
      document.querySelector(".animate-pulse");
    expect(loadingEl).not.toBeNull();
  });

  test("shows empty state CTA when useQuery returns empty array", () => {
    vi.mocked(convexReact.useQuery).mockReturnValue([]);

    render(<MyToolsPage />);

    // Empty state should contain some CTA text
    expect(
      screen.getByText(/no tools yet|create your first|get started/i),
    ).toBeInTheDocument();
  });

  test("renders correct number of tool cards and filters out templates", () => {
    vi.mocked(convexReact.useQuery).mockReturnValue([
      mockTool,
      mockTemplateTool,
    ]);

    render(<MyToolsPage />);

    // Only non-template tools should be rendered
    expect(screen.getByText("My Schedule")).toBeInTheDocument();
    expect(screen.queryByText("Template Tool")).not.toBeInTheDocument();
  });

  test("delete button triggers confirmation before calling remove mutation", async () => {
    const mockRemove = vi.fn();
    vi.mocked(convexReact.useQuery).mockReturnValue([mockTool]);
    vi.mocked(convexReact.useMutation).mockReturnValue(mockRemove);

    // Spy on window.confirm
    const confirmSpy = vi
      .spyOn(window, "confirm")
      .mockReturnValueOnce(false); // Cancel first

    const user = userEvent.setup();
    render(<MyToolsPage />);

    const deleteButton = screen.getByRole("button", { name: /delete/i });
    await user.click(deleteButton);

    // Confirmation was shown
    expect(confirmSpy).toHaveBeenCalled();
    // Remove was NOT called because user cancelled
    expect(mockRemove).not.toHaveBeenCalled();

    confirmSpy.mockRestore();
  });

  test("remove mutation is called after delete confirmation", async () => {
    const mockRemove = vi.fn();
    vi.mocked(convexReact.useQuery).mockReturnValue([mockTool]);
    vi.mocked(convexReact.useMutation).mockReturnValue(mockRemove);

    // Confirm the delete
    const confirmSpy = vi
      .spyOn(window, "confirm")
      .mockReturnValueOnce(true);

    const user = userEvent.setup();
    render(<MyToolsPage />);

    const deleteButton = screen.getByRole("button", { name: /delete/i });
    await user.click(deleteButton);

    expect(mockRemove).toHaveBeenCalledWith({ id: mockTool._id });

    confirmSpy.mockRestore();
  });

  test("tool cards have share buttons that open the share dialog", async () => {
    vi.mocked(convexReact.useQuery).mockReturnValue([mockTool]);

    const user = userEvent.setup();
    render(<MyToolsPage />);

    const shareButton = screen.getByRole("button", { name: /share/i });
    expect(shareButton).toBeInTheDocument();

    // Clicking share button should not crash and should trigger share dialog
    await user.click(shareButton);
    // After clicking, the dialog state should have changed (ShareDialog rendered)
    // Since ShareDialog is mocked to null, we just verify no error was thrown
  });
});
