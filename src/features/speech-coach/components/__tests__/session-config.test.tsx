import { fireEvent,render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { SessionConfig } from "../session-config";

const DEFAULT_CONFIG = {
  targetSounds: ["/s/", "/r/"],
  ageRange: "2-4" as const,
  defaultDurationMinutes: 5,
};

describe("SessionConfig", () => {
  it("renders target sound checkboxes", () => {
    render(<SessionConfig speechCoachConfig={DEFAULT_CONFIG} onStart={vi.fn()} />);
    expect(screen.getByLabelText("/s/ & /z/")).toBeInTheDocument();
    expect(screen.getByLabelText("/r/")).toBeInTheDocument();
    expect(screen.getByLabelText("/l/")).toBeInTheDocument();
  });

  it("pre-selects sounds from SLP config", () => {
    render(<SessionConfig speechCoachConfig={DEFAULT_CONFIG} onStart={vi.fn()} />);
    const sCheckbox = screen.getByLabelText("/s/ & /z/");
    expect(sCheckbox).toBeChecked();
    const rCheckbox = screen.getByLabelText("/r/");
    expect(rCheckbox).toBeChecked();
  });

  it("calls onStart with config when Start Session is clicked", () => {
    const onStart = vi.fn();
    render(<SessionConfig speechCoachConfig={DEFAULT_CONFIG} onStart={onStart} />);
    fireEvent.click(screen.getByText("Start Session"));
    expect(onStart).toHaveBeenCalledWith(
      expect.objectContaining({
        targetSounds: expect.arrayContaining(["/s/"]),
        ageRange: "2-4",
        durationMinutes: 5,
      })
    );
  });

  it("disables Start button when no sounds selected", () => {
    render(
      <SessionConfig
        speechCoachConfig={{ ...DEFAULT_CONFIG, targetSounds: [] }}
        onStart={vi.fn()}
      />
    );
    expect(screen.getByText("Start Session")).toBeDisabled();
  });

  it("shows 'based on last session' label when lastRecommended is provided", () => {
    render(
      <SessionConfig
        speechCoachConfig={DEFAULT_CONFIG}
        onStart={vi.fn()}
        lastRecommended={["/r/"]}
      />
    );
    expect(screen.getByText(/based on.*last session/i)).toBeInTheDocument();
  });

  it("offers 4 duration options including 8 and 15 minutes", () => {
    render(<SessionConfig speechCoachConfig={DEFAULT_CONFIG} onStart={vi.fn()} />);
    expect(screen.getByLabelText("8 minutes")).toBeInTheDocument();
    expect(screen.getByLabelText("15 minutes")).toBeInTheDocument();
  });
});
