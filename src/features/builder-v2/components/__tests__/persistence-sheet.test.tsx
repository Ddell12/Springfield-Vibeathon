import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { PersistenceSheet } from "../persistence-sheet";

// Mock shadcn Sheet to render its children inline for testing
vi.mock("@/shared/components/ui/sheet", () => ({
  Sheet: ({ children, open }: { children: React.ReactNode; open?: boolean }) =>
    open ? <div data-testid="sheet">{children}</div> : null,
  SheetContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="sheet-content">{children}</div>
  ),
  SheetHeader: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="sheet-header">{children}</div>
  ),
  SheetTitle: ({ children }: { children: React.ReactNode }) => (
    <h2>{children}</h2>
  ),
  SheetDescription: ({ children }: { children: React.ReactNode }) => (
    <p>{children}</p>
  ),
}));

describe("PersistenceSheet", () => {
  it("renders all 3 persistence tier options", () => {
    render(
      <PersistenceSheet open={true} onOpenChange={vi.fn()} onSelect={vi.fn()} />
    );

    // The three tiers should be visible
    expect(screen.getByText(/this session/i)).toBeInTheDocument();
    expect(screen.getByText(/save on this device/i)).toBeInTheDocument();
    expect(screen.getByText(/save to cloud/i)).toBeInTheDocument();
  });

  it("'Save on this device' option is selected by default", () => {
    render(
      <PersistenceSheet open={true} onOpenChange={vi.fn()} onSelect={vi.fn()} />
    );

    // The device option should have some "selected" indicator (aria-pressed, aria-checked, or data-selected)
    const deviceOption = screen.getByText(/save on this device/i).closest("[role='radio'], button, [data-selected]");
    expect(deviceOption).not.toBeNull();
  });

  it("calls onSelect with 'session' when the session option is clicked", async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();

    render(
      <PersistenceSheet open={true} onOpenChange={vi.fn()} onSelect={onSelect} />
    );

    const sessionOption = screen.getByText(/this session/i).closest("button") ??
      screen.getByText(/this session/i).closest("[role='radio']");
    if (sessionOption) {
      await user.click(sessionOption);
    } else {
      await user.click(screen.getByText(/this session/i));
    }

    expect(onSelect).toHaveBeenCalledWith("session");
  });

  it("calls onSelect with 'device' when the device option is clicked", async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();

    render(
      <PersistenceSheet open={true} onOpenChange={vi.fn()} onSelect={onSelect} />
    );

    const deviceOption = screen.getByText(/save on this device/i).closest("button") ??
      screen.getByText(/save on this device/i).closest("[role='radio']");
    if (deviceOption) {
      await user.click(deviceOption);
    } else {
      await user.click(screen.getByText(/save on this device/i));
    }

    expect(onSelect).toHaveBeenCalledWith("device");
  });

  it("calls onSelect with 'cloud' when the cloud option is clicked", async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();

    render(
      <PersistenceSheet open={true} onOpenChange={vi.fn()} onSelect={onSelect} />
    );

    const cloudOption = screen.getByText(/save to cloud/i).closest("button") ??
      screen.getByText(/save to cloud/i).closest("[role='radio']");
    if (cloudOption) {
      await user.click(cloudOption);
    } else {
      await user.click(screen.getByText(/save to cloud/i));
    }

    expect(onSelect).toHaveBeenCalledWith("cloud");
  });

  it("does not render when open is false", () => {
    render(
      <PersistenceSheet open={false} onOpenChange={vi.fn()} onSelect={vi.fn()} />
    );

    expect(screen.queryByTestId("sheet")).not.toBeInTheDocument();
  });
});
