import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { AppearanceControls } from "../appearance-controls";

describe("AppearanceControls", () => {
  it("calls onChange when theme preset changes", () => {
    const onChange = vi.fn();
    render(
      <AppearanceControls
        value={{ themePreset: "calm", accentColor: "#00595c" }}
        onChange={onChange}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Focused" }));

    expect(onChange).toHaveBeenCalledWith({
      themePreset: "focused",
      accentColor: "#00595c",
    });
  });

  it("calls onChange when accent color changes", () => {
    const onChange = vi.fn();
    render(
      <AppearanceControls
        value={{ themePreset: "calm", accentColor: "#00595c" }}
        onChange={onChange}
      />
    );

    fireEvent.change(screen.getByLabelText("Accent color"), {
      target: { value: "#0d7377" },
    });

    expect(onChange).toHaveBeenCalledWith({
      themePreset: "calm",
      accentColor: "#0d7377",
    });
  });
});
