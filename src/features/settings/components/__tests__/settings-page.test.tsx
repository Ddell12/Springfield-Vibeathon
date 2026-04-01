import { fireEvent, render, screen } from "@testing-library/react";

import { SettingsPage } from "../settings-page";

vi.mock("../profile-section", () => ({
  ProfileSection: () => <div data-testid="profile-section" />,
}));

vi.mock("../account-section", () => ({
  AccountSection: () => <div data-testid="account-section" />,
}));

vi.mock("../appearance-section", () => ({
  AppearanceSection: () => <div data-testid="appearance-section" />,
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
    expect(screen.getByRole("button", { name: /Profile/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Practice/i })).toBeInTheDocument();
  });

  it("renders the page heading", () => {
    render(<SettingsPage />);
    expect(screen.getByRole("heading", { name: "Settings" })).toBeInTheDocument();
  });

  it("shows the active section label", () => {
    render(<SettingsPage />);
    expect(
      screen.getByText("Profile", { selector: "p.text-xs.font-semibold.uppercase" })
    ).toBeInTheDocument();
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


  it("does not render a main element (layout provides the landmark)", () => {
    render(<SettingsPage />);
    const mains = document.querySelectorAll("main");
    expect(mains).toHaveLength(0);
  });
});
