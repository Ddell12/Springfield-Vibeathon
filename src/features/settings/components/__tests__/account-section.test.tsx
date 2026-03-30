import { render, screen } from "@testing-library/react";

import { AccountSection } from "../account-section";

vi.mock("@clerk/nextjs", () => ({
  useClerk: () => ({ signOut: vi.fn() }),
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

describe("AccountSection", () => {
  it("renders the Account heading", () => {
    render(<AccountSection />);
    expect(screen.getByRole("heading", { name: /Account/i })).toBeInTheDocument();
  });

  it("renders the Danger Zone text", () => {
    render(<AccountSection />);
    expect(screen.getByText(/Danger Zone/i)).toBeInTheDocument();
  });

  it("renders the delete account button as disabled", () => {
    render(<AccountSection />);
    const deleteBtn = screen.getByRole("button", { name: /Delete account/i });
    expect(deleteBtn).toBeDisabled();
  });

  it("renders the Advanced badge", () => {
    render(<AccountSection />);
    expect(screen.getByText("Advanced")).toBeInTheDocument();
  });

  it("renders the warning about permanent deletion", () => {
    render(<AccountSection />);
    expect(screen.getByText(/Deleting your account is permanent/i)).toBeInTheDocument();
  });
});
