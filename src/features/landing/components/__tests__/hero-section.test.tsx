import { render, screen } from "@testing-library/react";

import { HeroSection } from "../hero-section";

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

vi.mock("@/shared/components/material-icon", () => ({
  MaterialIcon: ({ icon }: { icon: string }) => <span>{icon}</span>,
}));

describe("HeroSection", () => {
  it("renders the headline text", () => {
    render(<HeroSection />);
    expect(
      screen.getByText(/Build therapy apps for your child/)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/just describe what you need/)
    ).toBeInTheDocument();
  });

  it("renders the description paragraph", () => {
    render(<HeroSection />);
    expect(
      screen.getByText(
        /Bridges uses AI to turn your words into interactive visual schedules/
      )
    ).toBeInTheDocument();
  });

  it("renders the primary CTA linking to /builder", () => {
    render(<HeroSection />);
    const cta = screen.getByRole("link", {
      name: /Start Building — It's Free/,
    });
    expect(cta).toHaveAttribute("href", "/builder");
  });

  it("renders the templates link pointing to /templates", () => {
    render(<HeroSection />);
    const link = screen.getByRole("link", { name: /View Templates/ });
    expect(link).toHaveAttribute("href", "/templates");
  });
});
