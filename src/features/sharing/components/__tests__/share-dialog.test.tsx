import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, test, expect, vi, beforeEach } from "vitest";
import { ShareDialog } from "../share-dialog";

// Mock react-qr-code to avoid canvas/SVG rendering complexity in jsdom
vi.mock("react-qr-code", () => ({
  default: (props: { value: string; size?: number }) => (
    <div data-testid="qr-code" data-value={props.value} />
  ),
}));

// Mock sonner toast to avoid DOM side effects in jsdom
vi.mock("sonner", () => ({
  toast: vi.fn(),
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
  toolTitle: "Morning Routine",
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

  test("renders the share URL in a readonly input containing the share slug path", () => {
    render(<ShareDialog {...defaultProps} />);

    const input = screen.getByRole("textbox") as HTMLInputElement;
    expect(input).toHaveAttribute("readonly");
    expect(input.value).toContain("/tool/abc1234567");
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
});
