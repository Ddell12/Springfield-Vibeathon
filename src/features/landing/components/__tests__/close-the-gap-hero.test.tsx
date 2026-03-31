import { render, screen } from "@testing-library/react";

import { CloseTheGapHero } from "../close-the-gap-hero";

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

describe("CloseTheGapHero", () => {
  it("renders the main heading text", () => {
    render(<CloseTheGapHero />);
    expect(
      screen.getByText(/Every child deserves a tool built/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/just for them\./i)).toBeInTheDocument();
  });

  it("renders the Build Your First App link pointing to /builder", () => {
    render(<CloseTheGapHero />);
    const link = screen.getByRole("link", { name: /Build Your First App/i });
    expect(link).toHaveAttribute("href", "/builder");
  });

  it("renders the Browse Templates link pointing to /library?tab=templates", () => {
    render(<CloseTheGapHero />);
    const link = screen.getByRole("link", { name: /Browse Templates/i });
    expect(link).toHaveAttribute("href", "/library?tab=templates");
  });

  it("renders the 5 min stat", () => {
    render(<CloseTheGapHero />);
    expect(screen.getByText("5 min")).toBeInTheDocument();
  });

  it("renders the 0 code stat", () => {
    render(<CloseTheGapHero />);
    expect(screen.getByText("0 code")).toBeInTheDocument();
  });

  it("renders the infinity stat", () => {
    render(<CloseTheGapHero />);
    expect(screen.getByText("∞")).toBeInTheDocument();
  });

  it("renders the vibeathon badge", () => {
    render(<CloseTheGapHero />);
    expect(
      screen.getByText(/Springfield Vibeathon 2026/i)
    ).toBeInTheDocument();
  });
});
