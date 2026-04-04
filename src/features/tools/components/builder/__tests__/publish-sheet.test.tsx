import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("convex/react", () => ({
  useQuery: vi.fn(() => [
    { _id: "patient-1", firstName: "Liam", lastName: "Chen" },
  ]),
}));
vi.mock("@convex/_generated/api", () => ({
  api: { patients: { list: "patients:list" } },
}));
vi.mock("qrcode.react", () => ({
  QRCodeSVG: ({ value }: { value: string }) => <svg data-testid="qr-code" data-value={value} />,
}));

import type { Id } from "@convex/_generated/dataModel";

import { PublishSheet } from "../publish-sheet";

const onPublish = vi.fn().mockResolvedValue("tok-abc");
const onClose = vi.fn();
const onSelectPatient = vi.fn();
const onUnpublish = vi.fn();

const baseProps = {
  open: true,
  onClose,
  isSaving: false,
  publishedShareToken: null,
  instanceId: "inst-1" as Id<"app_instances">,
  patientId: null,
  onSelectPatient,
  onPublish,
  onUnpublish,
};

describe("PublishSheet — unpublished state", () => {
  it("shows Publish app button when not yet published", () => {
    render(<PublishSheet {...baseProps} />);
    expect(screen.getByRole("button", { name: /publish app/i })).toBeInTheDocument();
  });

  it("calls onPublish when button clicked", async () => {
    render(<PublishSheet {...baseProps} />);
    fireEvent.click(screen.getByRole("button", { name: /publish app/i }));
    await waitFor(() => expect(onPublish).toHaveBeenCalled());
  });
});

describe("PublishSheet — published state", () => {
  const published = { ...baseProps, publishedShareToken: "tok-abc" };

  it("shows QR code", () => {
    render(<PublishSheet {...published} />);
    expect(screen.getByTestId("qr-code")).toBeInTheDocument();
  });

  it("shows patient dropdown", () => {
    render(<PublishSheet {...published} />);
    expect(screen.getByText(/assign to child/i)).toBeInTheDocument();
    // The SelectTrigger confirms the patient dropdown is wired
    expect(screen.getByRole("combobox")).toBeInTheDocument();
  });

  it("shows Open in Session button that links to ?session=true URL", () => {
    render(<PublishSheet {...published} />);
    const btn = screen.getByRole("link", { name: /open in session/i });
    expect(btn).toHaveAttribute("href", expect.stringContaining("?session=true"));
  });

  it("shows unpublish button", () => {
    render(<PublishSheet {...published} />);
    expect(screen.getByRole("button", { name: /unpublish/i })).toBeInTheDocument();
  });

  it("calls onUnpublish when unpublish clicked", () => {
    render(<PublishSheet {...published} />);
    fireEvent.click(screen.getByRole("button", { name: /unpublish/i }));
    expect(onUnpublish).toHaveBeenCalled();
  });
});
