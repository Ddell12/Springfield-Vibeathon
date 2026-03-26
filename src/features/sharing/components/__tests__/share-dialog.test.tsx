import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { ShareDialog } from "../share-dialog";

// Mock react-qr-code to avoid canvas/SVG rendering complexity in jsdom
vi.mock("react-qr-code", () => ({
  default: (props: { value: string; size?: number }) => (
    <div data-testid="qr-code" data-value={props.value} />
  ),
}));

// Mock MaterialIcon to avoid font-loading issues
vi.mock("@/shared/components/material-icon", () => ({
  MaterialIcon: ({ icon }: { icon: string }) => <span data-testid={`icon-${icon}`} aria-hidden="true" />,
}));

// Mock sonner toast to avoid DOM side effects in jsdom
vi.mock("sonner", () => ({
  toast: Object.assign(vi.fn(), {
    success: vi.fn(),
    error: vi.fn(),
  }),
}));

// Mock navigator.clipboard
const mockWriteText = vi.fn().mockResolvedValue(undefined);
Object.defineProperty(navigator, "clipboard", {
  value: { writeText: mockWriteText },
  writable: true,
  configurable: true,
});

// Mock window.location.origin
Object.defineProperty(window, "location", {
  value: { origin: "http://localhost:3000" },
  writable: true,
});

const defaultProps = {
  open: true,
  onOpenChange: vi.fn(),
  shareSlug: "abc1234567",
  appTitle: "Morning Routine",
};

describe("ShareDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWriteText.mockResolvedValue(undefined);
  });

  test("renders dialog when open=true with tool title in heading", () => {
    render(<ShareDialog {...defaultProps} />);

    expect(screen.getByText(/Morning Routine/i)).toBeInTheDocument();
  });

  test("displays the share URL containing the share slug path", () => {
    render(<ShareDialog {...defaultProps} />);

    // URL is displayed as text in a span element, not an input
    expect(screen.getByText(/\/tool\/abc1234567/)).toBeInTheDocument();
  });

  test("Copy Link button calls navigator.clipboard.writeText with correct URL", async () => {
    render(<ShareDialog {...defaultProps} />);

    const copyButton = screen.getByRole("button", { name: /copy link/i });
    fireEvent.click(copyButton);

    await waitFor(() => {
      expect(mockWriteText).toHaveBeenCalledWith(
        "http://localhost:3000/tool/abc1234567",
      );
    });
  });

  test("QR code component receives the full share URL as value prop", () => {
    render(<ShareDialog {...defaultProps} />);

    const qrCode = screen.getByTestId("qr-code");
    expect(qrCode).toHaveAttribute(
      "data-value",
      "http://localhost:3000/tool/abc1234567",
    );
  });

  test("renders Share button when navigator.share is available", async () => {
    const mockShare = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "share", {
      value: mockShare,
      writable: true,
      configurable: true,
    });

    const user = userEvent.setup();
    render(<ShareDialog {...defaultProps} />);

    const shareButton = screen.getByRole("button", { name: /^share$/i });
    expect(shareButton).toBeInTheDocument();

    await user.click(shareButton);
    expect(mockShare).toHaveBeenCalled();
  });

  test("hides Share button when navigator.share is undefined", () => {
    Object.defineProperty(navigator, "share", {
      value: undefined,
      writable: true,
      configurable: true,
    });

    render(<ShareDialog {...defaultProps} />);

    expect(
      screen.queryByRole("button", { name: /^share$/i }),
    ).not.toBeInTheDocument();
  });

  test("calls onOpenChange when dialog is closed", async () => {
    const onOpenChange = vi.fn();
    const user = userEvent.setup();
    render(<ShareDialog {...defaultProps} onOpenChange={onOpenChange} />);

    // Close via the explicit Close button (not the shadcn X button)
    const closeButtons = screen.getAllByRole("button", { name: /close/i });
    // Click the last one — our explicit Close button (shadcn X is first)
    await user.click(closeButtons[closeButtons.length - 1]);

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  test("renders 'Preview Link' tab when no publishedUrl is provided", () => {
    render(<ShareDialog {...defaultProps} />);
    // Should show preview link tab (the share-slug based link)
    expect(screen.getByText(/preview link/i)).toBeInTheDocument();
  });

  test("renders 'Published Link' tab when publishedUrl is provided", () => {
    render(
      <ShareDialog
        {...defaultProps}
        publishedUrl="https://bridges-morning-routine.vercel.app"
      />
    );
    expect(screen.getByText(/published link/i)).toBeInTheDocument();
  });

  test("'Published Link' tab displays the Vercel URL when clicked", async () => {
    const user = userEvent.setup();
    render(
      <ShareDialog
        {...defaultProps}
        publishedUrl="https://bridges-morning-routine.vercel.app"
      />
    );

    // Click the Published Link tab
    const publishedTab = screen.getByText(/published link/i);
    await user.click(publishedTab);

    // URL is displayed as text in a span
    expect(screen.getByText(/vercel\.app/)).toBeInTheDocument();
  });

  test("switching tabs changes the displayed URL", async () => {
    const user = userEvent.setup();
    render(
      <ShareDialog
        {...defaultProps}
        publishedUrl="https://bridges-morning-routine.vercel.app"
      />
    );

    // Preview link tab shows the slug URL by default
    expect(screen.getByText(/\/tool\/abc1234567/)).toBeInTheDocument();

    // Switch to Published Link tab
    const publishedTab = screen.getByText(/published link/i);
    await user.click(publishedTab);

    // Now the Vercel URL should be displayed
    expect(screen.getByText(/vercel\.app/)).toBeInTheDocument();
  });

  test("handleShare is called and navigator.share succeeds", async () => {
    const mockShare = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "share", {
      value: mockShare,
      writable: true,
      configurable: true,
    });

    const user = userEvent.setup();
    render(<ShareDialog {...defaultProps} />);

    const shareButton = screen.getByRole("button", { name: /^share$/i });
    await user.click(shareButton);

    expect(mockShare).toHaveBeenCalledWith({
      title: "Morning Routine",
      url: "http://localhost:3000/tool/abc1234567",
    });
  });

  test("handleShare silently handles user cancellation", async () => {
    const mockShare = vi.fn().mockRejectedValue(new Error("AbortError"));
    Object.defineProperty(navigator, "share", {
      value: mockShare,
      writable: true,
      configurable: true,
    });

    const user = userEvent.setup();
    render(<ShareDialog {...defaultProps} />);

    const shareButton = screen.getByRole("button", { name: /^share$/i });
    // Should not throw
    await expect(user.click(shareButton)).resolves.not.toThrow();
  });

  test("clicking 'Preview Link' tab sets activeTab to preview", async () => {
    const user = userEvent.setup();
    render(
      <ShareDialog
        {...defaultProps}
        publishedUrl="https://bridges-morning-routine.vercel.app"
      />
    );

    // Switch to published first
    const publishedTab = screen.getByText(/published link/i);
    await user.click(publishedTab);

    // Now click preview tab to switch back
    const previewTab = screen.getByText(/preview link/i);
    await user.click(previewTab);

    // URL should revert back to slug URL
    expect(screen.getByText(/\/tool\/abc1234567/)).toBeInTheDocument();
  });

  test("Close button in header calls onOpenChange(false)", async () => {
    const onOpenChange = vi.fn();
    const user = userEvent.setup();
    render(<ShareDialog {...defaultProps} onOpenChange={onOpenChange} />);

    const closeButtons = screen.getAllByRole("button", { name: /close/i });
    // Click the first close button (the 'X' in header)
    await user.click(closeButtons[0]);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
