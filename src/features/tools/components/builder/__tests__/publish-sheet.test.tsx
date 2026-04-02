import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { PublishSheet } from "../publish-sheet";

const mockOnPublish = vi.fn().mockResolvedValue("tok-abc");
const mockOnClose = vi.fn();

describe("PublishSheet", () => {
  it("renders nothing when closed", () => {
    render(
      <PublishSheet
        open={false}
        onClose={mockOnClose}
        isSaving={false}
        publishedShareToken={null}
        onPublish={mockOnPublish}
      />
    );
    expect(screen.queryByText(/publish/i)).not.toBeInTheDocument();
  });

  it("shows Publish button when open and not yet published", () => {
    render(
      <PublishSheet
        open={true}
        onClose={mockOnClose}
        isSaving={false}
        publishedShareToken={null}
        onPublish={mockOnPublish}
      />
    );
    expect(screen.getByRole("button", { name: /publish app/i })).toBeInTheDocument();
  });

  it("shows share link when already published", () => {
    render(
      <PublishSheet
        open={true}
        onClose={mockOnClose}
        isSaving={false}
        publishedShareToken="tok-abc"
        onPublish={mockOnPublish}
      />
    );
    expect(screen.getByText(/tok-abc/)).toBeInTheDocument();
  });

  it("calls onPublish when Publish app is clicked", async () => {
    render(
      <PublishSheet
        open={true}
        onClose={mockOnClose}
        isSaving={false}
        publishedShareToken={null}
        onPublish={mockOnPublish}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: /publish app/i }));
    await waitFor(() => expect(mockOnPublish).toHaveBeenCalled());
  });
});
