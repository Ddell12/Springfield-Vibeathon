import { fireEvent, render, screen } from "@testing-library/react";

import { ProfileSection } from "../profile-section";

const mockUpdate = vi.fn().mockResolvedValue({});

vi.mock("@clerk/nextjs", () => ({
  useUser: () => ({
    isLoaded: true,
    user: {
      firstName: "Desha",
      fullName: "Desha Dell",
      primaryEmailAddress: { emailAddress: "desha@vocali.ai" },
      update: mockUpdate,
    },
  }),
}));

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
    mockUpdate.mockClear();
  });

  it("renders the Profile heading", () => {
    render(<ProfileSection />);
    expect(screen.getByRole("heading", { name: /Profile/i })).toBeInTheDocument();
  });

  it("renders avatar showing first letter of user name from Clerk", () => {
    render(<ProfileSection />);
    expect(screen.getByText("D")).toBeInTheDocument();
  });

  it("renders the display name input with Clerk user name", () => {
    render(<ProfileSection />);
    const input = screen.getByDisplayValue("Desha");
    expect(input).toBeInTheDocument();
  });

  it("renders the email input as disabled with Clerk email", () => {
    render(<ProfileSection />);
    const emailInput = screen.getByDisplayValue("desha@vocali.ai");
    expect(emailInput).toBeDisabled();
  });

  it("save button shows 'Save changes' initially", () => {
    render(<ProfileSection />);
    expect(screen.getByRole("button", { name: /Save changes/i })).toBeInTheDocument();
  });

  it("calls Clerk user.update on save", async () => {
    render(<ProfileSection />);
    const saveBtn = screen.getByRole("button", { name: /Save changes/i });
    fireEvent.click(saveBtn);
    // Wait for the async update
    await vi.waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith({ firstName: "Desha" });
    });
  });

  it("avatar updates when display name changes", () => {
    render(<ProfileSection />);
    const input = screen.getByDisplayValue("Desha");
    fireEvent.change(input, { target: { value: "Alex" } });
    expect(screen.getByText("A")).toBeInTheDocument();
  });
});
