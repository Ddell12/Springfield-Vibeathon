import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { PublishDialog } from "../publish-dialog";

// Mock shadcn Dialog
vi.mock("@/shared/components/ui/dialog", () => ({
  Dialog: ({ children, open }: { children: React.ReactNode; open?: boolean }) =>
    open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dialog-content">{children}</div>
  ),
  DialogHeader: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dialog-header">{children}</div>
  ),
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  DialogDescription: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  DialogFooter: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dialog-footer">{children}</div>
  ),
}));

vi.mock("sonner", () => ({ toast: vi.fn() }));

// Mock clipboard
const mockWriteText = vi.fn().mockResolvedValue(undefined);
Object.defineProperty(navigator, "clipboard", {
  value: { writeText: mockWriteText },
  writable: true,
  configurable: true,
});

const defaultProps = {
  open: true,
  onOpenChange: vi.fn(),
  onPublish: vi.fn(),
  projectTitle: "Morning Routine",
};

describe("PublishDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockWriteText.mockResolvedValue(undefined);
  });

  it("renders in idle state by default", () => {
    render(<PublishDialog {...defaultProps} status="idle" />);
    // Should show a Publish button and no URL
    expect(screen.getByRole("button", { name: /publish/i })).toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });

  it("renders a loading indicator when status is 'building'", () => {
    render(<PublishDialog {...defaultProps} status="building" />);
    // Should show loading state — spinner, "Publishing...", or similar
    expect(
      screen.queryByText(/publishing|building|deploying/i)
    ).toBeInTheDocument();
  });

  it("renders the published URL when status is 'done'", () => {
    render(
      <PublishDialog
        {...defaultProps}
        status="done"
        publishedUrl="https://bridges-morning-routine.vercel.app"
      />
    );
    const input = screen.getByRole("textbox") as HTMLInputElement;
    expect(input.value).toContain("bridges-morning-routine.vercel.app");
  });

  it("shows error message when status is 'error'", () => {
    render(
      <PublishDialog
        {...defaultProps}
        status="error"
        errorMessage="Failed to publish — please try again"
      />
    );
    expect(screen.getByText(/failed to publish|please try again/i)).toBeInTheDocument();
  });

  it("copy URL button calls navigator.clipboard.writeText when status is done", async () => {
    const user = userEvent.setup();
    render(
      <PublishDialog
        {...defaultProps}
        status="done"
        publishedUrl="https://bridges-morning-routine.vercel.app"
      />
    );

    const copyBtn = screen.getByRole("button", { name: /copy/i });
    await user.click(copyBtn);

    await waitFor(() => {
      expect(mockWriteText).toHaveBeenCalledWith("https://bridges-morning-routine.vercel.app");
    });
  });

  it("calls onPublish when Publish button is clicked in idle state", async () => {
    const onPublish = vi.fn();
    const user = userEvent.setup();

    render(<PublishDialog {...defaultProps} status="idle" onPublish={onPublish} />);
    await user.click(screen.getByRole("button", { name: /publish/i }));

    expect(onPublish).toHaveBeenCalledTimes(1);
  });

  it("does not render when open is false", () => {
    render(<PublishDialog {...defaultProps} open={false} status="idle" />);
    expect(screen.queryByTestId("dialog")).not.toBeInTheDocument();
  });
});
