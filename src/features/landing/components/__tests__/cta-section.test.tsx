import { render, screen } from "@testing-library/react";

import { CtaSection } from "../cta-section";

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

describe("CtaSection", () => {
  it("renders the section heading", () => {
    render(<CtaSection />);
    expect(
      screen.getByText(/Start building therapy apps today — for free\./i)
    ).toBeInTheDocument();
  });

  it("renders the Build Your First App link pointing to /builder", () => {
    render(<CtaSection />);
    const link = screen.getByRole("link", { name: /Build Your First App/i });
    expect(link).toHaveAttribute("href", "/builder");
  });

  it("renders the supporting description text", () => {
    render(<CtaSection />);
    expect(
      screen.getByText(/No account required/i)
    ).toBeInTheDocument();
  });
});
