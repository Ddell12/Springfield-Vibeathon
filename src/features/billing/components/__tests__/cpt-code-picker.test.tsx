import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { CPT_CODES } from "../../lib/cpt-codes";
import { CptCodePicker } from "../cpt-code-picker";

// Mock Select — Radix portals don't work in jsdom
vi.mock("@/shared/components/ui/select", () => ({
  Select: ({
    children,
    onValueChange,
    value,
    disabled,
  }: {
    children: React.ReactNode;
    onValueChange: (v: string) => void;
    value: string;
    disabled?: boolean;
  }) => (
    <select
      role="combobox"
      value={value}
      disabled={disabled}
      onChange={(e) => onValueChange(e.target.value)}
    >
      {children}
    </select>
  ),
  SelectTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SelectValue: ({ placeholder }: { placeholder?: string }) => <>{placeholder}</>,
  SelectContent: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SelectItem: ({
    children,
    value,
  }: {
    children: React.ReactNode;
    value: string;
  }) => <option value={value}>{children}</option>,
}));

describe("CptCodePicker", () => {
  it("renders with the selected CPT code", () => {
    render(<CptCodePicker value="92507" onChange={vi.fn()} />);
    expect(screen.getByText(/92507/)).toBeInTheDocument();
  });

  it("shows all 9 options when opened", async () => {
    render(<CptCodePicker value="92507" onChange={vi.fn()} />);

    const options = screen.getAllByRole("option");
    expect(options).toHaveLength(CPT_CODES.length);
  });

  it("calls onChange with code and description when selected", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<CptCodePicker value="92507" onChange={onChange} />);

    await user.selectOptions(screen.getByRole("combobox"), "92523");

    expect(onChange).toHaveBeenCalledWith("92523", "Evaluation — speech sound + language");
  });
});
