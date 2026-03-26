import { fireEvent,render, screen } from "@testing-library/react";

import { PublishSuccessModal } from "../publish-success-modal";

vi.mock("@/core/clipboard", () => ({ copyToClipboard: vi.fn() }));
vi.mock("sonner", () => ({ toast: vi.fn() }));

vi.mock("@/shared/components/material-icon", () => ({
  MaterialIcon: ({ icon }: { icon: string }) => <span data-testid="icon">{icon}</span>,
}));

vi.mock("@/shared/components/ui/dialog", () => ({
  Dialog: ({ open, children }: any) => open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <h2>{children}</h2>,
  DialogDescription: ({ children }: any) => <p>{children}</p>,
}));

vi.mock("@/shared/components/ui/button", () => ({
  Button: ({ children, onClick, disabled, asChild, ...props }: any) => {
    if (asChild) return <>{children}</>;
    return <button onClick={onClick} disabled={disabled} {...props}>{children}</button>;
  },
}));

const { copyToClipboard } = await import("@/core/clipboard");
const { toast } = await import("sonner");

const defaultProps = {
  open: true,
  onOpenChange: vi.fn(),
  projectName: "My Therapy Tool",
  publishedUrl: "https://example.vercel.app",
  onBackToBuilder: vi.fn(),
};

describe("PublishSuccessModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders 'Your tool is live!' title when open=true", () => {
    render(<PublishSuccessModal {...defaultProps} />);
    expect(screen.getByText("Your tool is live!")).toBeInTheDocument();
  });

  it("shows projectName in description", () => {
    render(<PublishSuccessModal {...defaultProps} />);
    expect(screen.getByText(/My Therapy Tool/)).toBeInTheDocument();
  });

  it("shows publishedUrl in the URL display", () => {
    render(<PublishSuccessModal {...defaultProps} />);
    expect(screen.getByText("https://example.vercel.app")).toBeInTheDocument();
  });

  it("Copy URL button calls copyToClipboard", () => {
    render(<PublishSuccessModal {...defaultProps} />);
    const copyBtn = screen.getByRole("button", { name: "Copy URL" });
    fireEvent.click(copyBtn);
    expect(copyToClipboard).toHaveBeenCalledWith("https://example.vercel.app", "Link copied!");
  });

  it("Back to Builder button calls onBackToBuilder AND onOpenChange(false)", () => {
    const onBackToBuilder = vi.fn();
    const onOpenChange = vi.fn();
    render(
      <PublishSuccessModal
        {...defaultProps}
        onBackToBuilder={onBackToBuilder}
        onOpenChange={onOpenChange}
      />
    );
    fireEvent.click(screen.getByText("Back to Builder"));
    expect(onBackToBuilder).toHaveBeenCalled();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("View published tool link has href=publishedUrl and target=_blank", () => {
    render(<PublishSuccessModal {...defaultProps} />);
    const link = screen.getByText("View published tool").closest("a");
    expect(link).toHaveAttribute("href", "https://example.vercel.app");
    expect(link).toHaveAttribute("target", "_blank");
  });

  it("QR Code button calls toast('QR code coming soon')", () => {
    render(<PublishSuccessModal {...defaultProps} />);
    const qrBtn = screen.getByRole("button", { name: "Generate QR code" });
    fireEvent.click(qrBtn);
    expect(toast).toHaveBeenCalledWith("QR code coming soon");
  });

  it("Share button calls navigator.share when available", async () => {
    const mockShare = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "share", {
      value: mockShare,
      configurable: true,
      writable: true,
    });
    render(<PublishSuccessModal {...defaultProps} />);
    const shareBtn = screen.getByRole("button", { name: "Share published tool" });
    fireEvent.click(shareBtn);
    // Give it a tick to resolve the async
    await Promise.resolve();
    expect(mockShare).toHaveBeenCalledWith({
      url: "https://example.vercel.app",
      title: "My Therapy Tool",
    });
  });

  it("Share button falls back to copyToClipboard when navigator.share is unavailable", async () => {
    Object.defineProperty(navigator, "share", {
      value: undefined,
      configurable: true,
      writable: true,
    });
    render(<PublishSuccessModal {...defaultProps} />);
    const shareBtn = screen.getByRole("button", { name: "Share published tool" });
    fireEvent.click(shareBtn);
    await Promise.resolve();
    expect(copyToClipboard).toHaveBeenCalledWith("https://example.vercel.app", "Link copied!");
  });

  it("renders nothing when open=false", () => {
    const { container } = render(<PublishSuccessModal {...defaultProps} open={false} />);
    expect(container.firstChild).toBeNull();
  });
});
