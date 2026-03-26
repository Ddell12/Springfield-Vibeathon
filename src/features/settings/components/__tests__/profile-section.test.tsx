import { act, fireEvent, render, screen } from "@testing-library/react";

import { ProfileSection } from "../profile-section";

vi.mock("@/shared/components/material-icon", () => ({
  MaterialIcon: ({ icon }: { icon: string }) => (
    <span data-testid="icon">{icon}</span>
  ),
}));

vi.mock("@/shared/components/ui/button", () => ({
  Button: ({ children, onClick, disabled, ...props }: any) => (
    <button onClick={onClick} disabled={disabled} {...props}>
      {children}
    </button>
  ),
}));

vi.mock("@/shared/components/ui/input", () => ({
  Input: (props: any) => <input {...props} />,
}));

vi.mock("@/shared/components/ui/label", () => ({
  Label: ({ children, ...props }: any) => <label {...props}>{children}</label>,
}));

describe("ProfileSection", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders the Profile heading", () => {
    render(<ProfileSection />);
    expect(screen.getByRole("heading", { name: /Profile/i })).toBeInTheDocument();
  });

  it("renders avatar showing first letter of the default name", () => {
    render(<ProfileSection />);
    // Default name is "Desha", first letter is "D"
    expect(screen.getByText("D")).toBeInTheDocument();
  });

  it("renders the display name input with default value", () => {
    render(<ProfileSection />);
    const input = screen.getByDisplayValue("Desha");
    expect(input).toBeInTheDocument();
  });

  it("renders the email input as disabled", () => {
    render(<ProfileSection />);
    const emailInput = screen.getByDisplayValue("user@bridges.ai");
    expect(emailInput).toBeDisabled();
  });

  it("renders the role select with expected options", () => {
    render(<ProfileSection />);
    const select = screen.getByRole("combobox");
    expect(select).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Parent" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "ABA Therapist" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Speech Therapist" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Teacher" })).toBeInTheDocument();
  });

  it("save button shows 'Save changes' initially", () => {
    render(<ProfileSection />);
    expect(screen.getByRole("button", { name: /Save changes/i })).toBeInTheDocument();
  });

  it("save button shows 'Saved!' after click and resets after 2000ms", () => {
    render(<ProfileSection />);
    const saveBtn = screen.getByRole("button", { name: /Save changes/i });
    fireEvent.click(saveBtn);
    expect(screen.getByRole("button", { name: /Saved!/i })).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(screen.getByRole("button", { name: /Save changes/i })).toBeInTheDocument();
  });

  it("avatar updates when display name changes", () => {
    render(<ProfileSection />);
    const input = screen.getByDisplayValue("Desha");
    fireEvent.change(input, { target: { value: "Alex" } });
    expect(screen.getByText("A")).toBeInTheDocument();
  });
});
