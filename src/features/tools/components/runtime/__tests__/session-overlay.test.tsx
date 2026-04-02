import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SessionOverlay } from "../session-overlay";

const onEndSession = vi.fn();
const baseProps = {
  events: [], startTimeMs: Date.now(),
  toolTitle: "Test Tool", templateType: "token_board",
  onEndSession,
};

describe("SessionOverlay", () => {
  it("renders floating session button", () => {
    render(<SessionOverlay {...baseProps} />);
    expect(screen.getByRole("button", { name: /session controls/i })).toBeInTheDocument();
  });

  it("opens panel on click", () => {
    render(<SessionOverlay {...baseProps} />);
    fireEvent.click(screen.getByRole("button", { name: /session controls/i }));
    expect(screen.getByRole("button", { name: /end session/i })).toBeInTheDocument();
  });

  it("shows event count in panel", () => {
    const events = [
      { type: "item_tapped", timestamp: Date.now() },
      { type: "token_added", timestamp: Date.now() },
    ];
    render(<SessionOverlay {...baseProps} events={events} />);
    fireEvent.click(screen.getByRole("button", { name: /session controls/i }));
    expect(screen.getByText(/2 events/i)).toBeInTheDocument();
  });

  it("calls onEndSession when End Session clicked", () => {
    render(<SessionOverlay {...baseProps} />);
    fireEvent.click(screen.getByRole("button", { name: /session controls/i }));
    fireEvent.click(screen.getByRole("button", { name: /end session/i }));
    expect(onEndSession).toHaveBeenCalled();
  });
});
