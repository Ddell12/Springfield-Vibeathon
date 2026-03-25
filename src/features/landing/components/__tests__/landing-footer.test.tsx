import { render, screen } from "@testing-library/react";

import { LandingFooter } from "../landing-footer";

describe("LandingFooter", () => {
  it("renders the Bridges brand name", () => {
    render(<LandingFooter />);
    expect(screen.getByText("Bridges")).toBeInTheDocument();
  });

  it("renders copyright text with the current year", () => {
    render(<LandingFooter />);
    const year = new Date().getFullYear().toString();
    expect(
      screen.getByText(new RegExp(`${year} Bridges AI. All rights reserved`))
    ).toBeInTheDocument();
  });

  it("renders Privacy Policy, Terms of Service, and Accessibility text", () => {
    render(<LandingFooter />);
    expect(screen.getByText("Privacy Policy")).toBeInTheDocument();
    expect(screen.getByText("Terms of Service")).toBeInTheDocument();
    expect(screen.getByText("Accessibility")).toBeInTheDocument();
  });
});
