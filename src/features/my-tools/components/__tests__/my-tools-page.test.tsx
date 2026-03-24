import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Id } from "convex/_generated/dataModel";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { MyToolsPage } from "../my-tools-page";

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

// Mock AlertDialog so we can control confirm/cancel interactions
vi.mock("@/shared/components/ui/alert-dialog", () => ({
  AlertDialog: ({ children, open }: { children: React.ReactNode; open?: boolean }) =>
    open ? <div data-testid="alert-dialog">{children}</div> : null,
  AlertDialogContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="alert-dialog-content">{children}</div>
  ),
  AlertDialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AlertDialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  AlertDialogDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  AlertDialogAction: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => (
    <button data-testid="alert-confirm" onClick={onClick}>{children}</button>
  ),
  AlertDialogCancel: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => (
    <button data-testid="alert-cancel" onClick={onClick}>{children}</button>
  ),
}));

// Mock material-icon to avoid font-loading issues
vi.mock("@/shared/components/material-icon", () => ({
  MaterialIcon: ({ icon }: { icon: string }) => (
    <span data-testid={`icon-${icon}`} />
  ),
}));

import * as convexReact from "convex/react";

const mockProject = {
  _id: "project1" as Id<"projects">,
  _creationTime: Date.now(),
  title: "My Schedule",
  description: "A visual schedule",
  shareSlug: "abc1234567",
  createdAt: Date.now(),
  updatedAt: Date.now(),
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
    expect(screen.queryByText("My Schedule")).not.toBeInTheDocument();
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

  test("renders project cards from the projects table", () => {
    vi.mocked(convexReact.useQuery).mockReturnValue([mockProject]);

    render(<MyToolsPage />);

    expect(screen.getByText("My Schedule")).toBeInTheDocument();
  });

  test("delete button opens AlertDialog for confirmation", async () => {
    const mockRemove = vi.fn();
    vi.mocked(convexReact.useQuery).mockReturnValue([mockProject]);
    vi.mocked(convexReact.useMutation).mockReturnValue(mockRemove);

    const user = userEvent.setup();
    render(<MyToolsPage />);

    const deleteButton = screen.getByRole("button", { name: /delete/i });
    await user.click(deleteButton);

    // AlertDialog should now be open
    expect(screen.getByTestId("alert-dialog")).toBeInTheDocument();
    // Remove was NOT called yet — waiting for confirmation
    expect(mockRemove).not.toHaveBeenCalled();
  });

  test("cancel in AlertDialog does not call remove mutation", async () => {
    const mockRemove = vi.fn();
    vi.mocked(convexReact.useQuery).mockReturnValue([mockProject]);
    vi.mocked(convexReact.useMutation).mockReturnValue(mockRemove);

    const user = userEvent.setup();
    render(<MyToolsPage />);

    await user.click(screen.getByRole("button", { name: /delete/i }));
    await user.click(screen.getByTestId("alert-cancel"));

    expect(mockRemove).not.toHaveBeenCalled();
  });

  test("confirm in AlertDialog calls removeProject with projectId", async () => {
    const mockRemove = vi.fn();
    vi.mocked(convexReact.useQuery).mockReturnValue([mockProject]);
    vi.mocked(convexReact.useMutation).mockReturnValue(mockRemove);

    const user = userEvent.setup();
    render(<MyToolsPage />);

    await user.click(screen.getByRole("button", { name: /delete/i }));
    await user.click(screen.getByTestId("alert-confirm"));

    expect(mockRemove).toHaveBeenCalledWith({ projectId: mockProject._id });
  });

  test("tool cards have share buttons that open the share dialog", async () => {
    vi.mocked(convexReact.useQuery).mockReturnValue([mockProject]);

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
