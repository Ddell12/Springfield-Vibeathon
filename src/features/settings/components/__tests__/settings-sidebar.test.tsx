import { fireEvent, render, screen } from "@testing-library/react";

import { SettingsSidebar } from "../settings-sidebar";

vi.mock("@/shared/components/material-icon", () => ({
  MaterialIcon: ({ icon }: { icon: string }) => (
    <span data-testid="icon">{icon}</span>
  ),
}));

vi.mock("@/core/utils", () => ({
  cn: (...classes: any[]) => classes.filter(Boolean).join(" "),
}));

describe("SettingsSidebar", () => {
  const onSectionChange = vi.fn();

  beforeEach(() => {
    onSectionChange.mockClear();
  });

  it("renders the main section buttons", () => {
    render(
      <SettingsSidebar activeSection="profile" onSectionChange={onSectionChange} />
    );
    expect(screen.getByRole("button", { name: /Profile/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Practice/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Account/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Appearance/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Billing/i })).toBeInTheDocument();
  });

  it("calls onSectionChange with 'profile' when Profile is clicked", () => {
    render(
      <SettingsSidebar activeSection="account" onSectionChange={onSectionChange} />
    );
    fireEvent.click(screen.getByRole("button", { name: /Profile/i }));
    expect(onSectionChange).toHaveBeenCalledWith("profile");
  });

  it("calls onSectionChange with 'account' when Account is clicked", () => {
    render(
      <SettingsSidebar activeSection="profile" onSectionChange={onSectionChange} />
    );
    fireEvent.click(screen.getByRole("button", { name: /Account/i }));
    expect(onSectionChange).toHaveBeenCalledWith("account");
  });

  it("calls onSectionChange with 'appearance' when Appearance is clicked", () => {
    render(
      <SettingsSidebar activeSection="profile" onSectionChange={onSectionChange} />
    );
    fireEvent.click(screen.getByRole("button", { name: /Appearance/i }));
    expect(onSectionChange).toHaveBeenCalledWith("appearance");
  });

  it("active section button has different styling class", () => {
    render(
      <SettingsSidebar activeSection="profile" onSectionChange={onSectionChange} />
    );
    const profileBtn = screen.getByRole("button", { name: /Profile/i });
    const accountBtn = screen.getByRole("button", { name: /Account/i });
    // Active button should contain active class, inactive should not
    expect(profileBtn.className).toContain("bg-white");
    expect(accountBtn.className).not.toContain("bg-white");
  });
});
