import { render, screen } from "@testing-library/react";

import { LandingFooter } from "../landing-footer";

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: React.ReactNode;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

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

  it("renders Privacy Policy, Terms of Service, and Accessibility links", () => {
    render(<LandingFooter />);
    expect(
      screen.getByRole("link", { name: /Privacy Policy/ })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Terms of Service/ })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Accessibility/ })
    ).toBeInTheDocument();
  });
});
