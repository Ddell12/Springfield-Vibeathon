import { render, screen } from "@testing-library/react";

import { HowItWorks } from "../how-it-works";

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("@/shared/components/material-icon", () => ({
  MaterialIcon: ({ icon }: { icon: string }) => <span>{icon}</span>,
}));

describe("HowItWorks", () => {
  it("renders the section heading", () => {
    render(<HowItWorks />);
    expect(
      screen.getByRole("heading", { name: /Built for the people who matter most/ })
    ).toBeInTheDocument();
  });

  it("renders the SLP column heading", () => {
    render(<HowItWorks />);
    expect(
      screen.getByRole("heading", { name: /For Speech Therapists/ })
    ).toBeInTheDocument();
  });

  it("renders the Family column heading", () => {
    render(<HowItWorks />);
    expect(
      screen.getByRole("heading", { name: /For Families/ })
    ).toBeInTheDocument();
  });

  it("renders SLP value props", () => {
    render(<HowItWorks />);
    expect(screen.getByText(/Build custom therapy apps in minutes/)).toBeInTheDocument();
    expect(screen.getByText(/Manage patient caseloads and goals/)).toBeInTheDocument();
    expect(screen.getByText(/Track progress with session notes/)).toBeInTheDocument();
    expect(screen.getByText(/Share apps directly with families/)).toBeInTheDocument();
  });

  it("renders Family value props", () => {
    render(<HowItWorks />);
    expect(screen.getByText(/Describe what your child needs in plain language/)).toBeInTheDocument();
    expect(screen.getByText(/Access speech coach anytime, anywhere/)).toBeInTheDocument();
    expect(screen.getByText(/Play therapy apps together at home/)).toBeInTheDocument();
    expect(screen.getByText(/Track your child/)).toBeInTheDocument();
  });

  it("renders SLP sign-up link", () => {
    render(<HowItWorks />);
    const links = screen.getAllByRole("link", { name: /Get Started/ });
    expect(links.length).toBeGreaterThanOrEqual(1);
    links.forEach((link) => expect(link).toHaveAttribute("href", "/sign-up"));
  });
});
