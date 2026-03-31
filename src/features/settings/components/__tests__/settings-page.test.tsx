import { fireEvent, render, screen } from "@testing-library/react";

import { SettingsPage } from "../settings-page";

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("@/shared/components/material-icon", () => ({
  MaterialIcon: ({ icon }: { icon: string }) => (
    <span data-testid="icon">{icon}</span>
  ),
}));

vi.mock("@/shared/components/ui/button", () => ({
  Button: ({ children, onClick, disabled, asChild, ...props }: any) => {
    if (asChild) return <>{children}</>;
    return (
      <button onClick={onClick} disabled={disabled} {...props}>
        {children}
      </button>
    );
  },
}));

vi.mock("../profile-section", () => ({
  ProfileSection: () => <div data-testid="profile-section" />,
}));

vi.mock("../account-section", () => ({
  AccountSection: () => <div data-testid="account-section" />,
}));

vi.mock("../appearance-section", () => ({
  AppearanceSection: () => <div data-testid="appearance-section" />,
}));

vi.mock("../../../billing/components/billing-section", () => ({
  BillingSection: () => <div data-testid="billing-section" />,
}));

vi.mock("../settings-sidebar", () => ({
  SettingsSidebar: ({ onSectionChange }: any) => (
    <div data-testid="settings-sidebar">
      <button onClick={() => onSectionChange("account")}>Account</button>
      <button onClick={() => onSectionChange("appearance")}>Appearance</button>
      <button onClick={() => onSectionChange("billing")}>Billing</button>
    </div>
  ),
}));

describe("SettingsPage", () => {
  it("defaults to profile section visible", () => {
    render(<SettingsPage />);
    expect(screen.getByTestId("profile-section")).toBeInTheDocument();
    expect(screen.queryByTestId("account-section")).not.toBeInTheDocument();
    expect(screen.queryByTestId("appearance-section")).not.toBeInTheDocument();
  });

  it("renders the sidebar", () => {
    render(<SettingsPage />);
    expect(screen.getByTestId("settings-sidebar")).toBeInTheDocument();
  });

  it("renders back link to /", () => {
    render(<SettingsPage />);
    const backLink = screen.getByRole("link", { name: /back to dashboard/i });
    expect(backLink).toHaveAttribute("href", "/");
  });

  it("mobile dropdown button shows current section label (Profile)", () => {
    render(<SettingsPage />);
    // The mobile dropdown button shows the section label
    expect(screen.getByText("Profile")).toBeInTheDocument();
  });

  it("clicking sidebar option switches to account section", () => {
    render(<SettingsPage />);
    fireEvent.click(screen.getByRole("button", { name: "Account" }));
    expect(screen.getByTestId("account-section")).toBeInTheDocument();
    expect(screen.queryByTestId("profile-section")).not.toBeInTheDocument();
  });

  it("clicking sidebar option switches to appearance section", () => {
    render(<SettingsPage />);
    fireEvent.click(screen.getByRole("button", { name: "Appearance" }));
    expect(screen.getByTestId("appearance-section")).toBeInTheDocument();
    expect(screen.queryByTestId("profile-section")).not.toBeInTheDocument();
  });

  it("Escape key closes the mobile dropdown", () => {
    render(<SettingsPage />);
    // Open dropdown first by clicking the mobile menu button (shows "Profile")
    const dropdownBtn = screen.getByRole("button", { name: /Profile/i });
    fireEvent.click(dropdownBtn);
    // dropdown options should now be visible (multiple Profile buttons)
    // Press Escape to close
    fireEvent.keyDown(document, { key: "Escape" });
    // After close, the listbox should be gone
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("clicking outside closes the mobile dropdown", () => {
    render(<SettingsPage />);
    const dropdownBtn = screen.getByRole("button", { name: /Profile/i });
    fireEvent.click(dropdownBtn);
    expect(screen.getByRole("listbox")).toBeInTheDocument();
    // Click outside the dropdown
    fireEvent.mouseDown(document.body);
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("clicking sidebar option switches to billing section", () => {
    render(<SettingsPage />);
    fireEvent.click(screen.getByRole("button", { name: "Billing" }));
    expect(screen.getByTestId("billing-section")).toBeInTheDocument();
    expect(screen.queryByTestId("profile-section")).not.toBeInTheDocument();
  });

  it("does not render a main element (layout provides the landmark)", () => {
    render(<SettingsPage />);
    const mains = document.querySelectorAll("main");
    expect(mains).toHaveLength(0);
  });
});
