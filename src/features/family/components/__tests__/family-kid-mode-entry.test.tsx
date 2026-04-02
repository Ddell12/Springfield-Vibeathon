import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { FamilyKidModeEntry } from "../family-kid-mode-entry";

describe("FamilyKidModeEntry", () => {
  it("disables the button when hasPIN is undefined", () => {
    render(
      <FamilyKidModeEntry
        hasPIN={undefined}
        onEnter={vi.fn()}
        onManageApps={vi.fn()}
      />
    );
    expect(screen.getByRole("button", { name: /kid mode/i })).toBeDisabled();
  });

  it("enables the button when hasPIN is false", () => {
    render(
      <FamilyKidModeEntry
        hasPIN={false}
        onEnter={vi.fn()}
        onManageApps={vi.fn()}
      />
    );
    expect(screen.getByRole("button", { name: /kid mode/i })).not.toBeDisabled();
  });

  it("enables the button when hasPIN is true", () => {
    render(
      <FamilyKidModeEntry
        hasPIN={true}
        onEnter={vi.fn()}
        onManageApps={vi.fn()}
      />
    );
    expect(screen.getByRole("button", { name: /kid mode/i })).not.toBeDisabled();
  });
});
