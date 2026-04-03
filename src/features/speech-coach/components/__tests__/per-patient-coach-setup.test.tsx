import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { PerPatientCoachSetup } from "../per-patient-coach-setup";

const DEFAULT_CONFIG = {
  targetSounds: ["/s/"],
  ageRange: "5-7" as const,
  defaultDurationMinutes: 10,
  childAge: 6,
};

const TEMPLATE_OPTIONS = [
  { _id: "tmpl1" as any, name: "My /r/ Protocol", version: 1 },
];

describe("PerPatientCoachSetup", () => {
  it("renders the current age and target sounds", () => {
    render(
      <PerPatientCoachSetup
        speechCoachConfig={DEFAULT_CONFIG}
        templates={TEMPLATE_OPTIONS}
        onSave={vi.fn()}
        isSaving={false}
      />
    );

    expect(screen.getByDisplayValue("6")).toBeInTheDocument();
    expect(screen.getByLabelText("/s/ & /z/")).toBeChecked();
  });

  it("shows SLP notes field prominently", () => {
    render(
      <PerPatientCoachSetup
        speechCoachConfig={DEFAULT_CONFIG}
        templates={TEMPLATE_OPTIONS}
        onSave={vi.fn()}
        isSaving={false}
      />
    );

    expect(screen.getByPlaceholderText(/Give extra wait time/)).toBeInTheDocument();
  });

  it("calls onSave with updated childAge when age is changed and saved", () => {
    const onSave = vi.fn();
    render(
      <PerPatientCoachSetup
        speechCoachConfig={DEFAULT_CONFIG}
        templates={TEMPLATE_OPTIONS}
        onSave={onSave}
        isSaving={false}
      />
    );

    fireEvent.change(screen.getByDisplayValue("6"), { target: { value: "8" } });
    fireEvent.click(screen.getByText("Save setup"));

    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ childAge: 8 }));
  });

  it("Advanced section is collapsed by default", () => {
    render(
      <PerPatientCoachSetup
        speechCoachConfig={DEFAULT_CONFIG}
        templates={TEMPLATE_OPTIONS}
        onSave={vi.fn()}
        isSaving={false}
      />
    );

    expect(screen.queryByText("Coach tone")).not.toBeInTheDocument();
    fireEvent.click(screen.getByText("Advanced overrides"));
    expect(screen.getByText("Coach tone")).toBeInTheDocument();
  });
});
