import { render, screen } from "@testing-library/react";
import { BuilderHeader } from "../builder-header";

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

describe("BuilderHeader", () => {
  it("renders the Bridges logo linking to home", () => {
    render(<BuilderHeader />);
    const logo = screen.getByRole("link", { name: /Bridges/ });
    expect(logo).toHaveAttribute("href", "/");
  });

  it("renders the tool name breadcrumb when toolName is provided", () => {
    render(<BuilderHeader toolName="Morning Routine" />);
    expect(screen.getByText("Morning Routine")).toBeInTheDocument();
  });

  it("does not render breadcrumb when toolName is not provided", () => {
    render(<BuilderHeader />);
    expect(screen.queryByText("edit")).not.toBeInTheDocument();
  });

  it("renders the Share action button", () => {
    render(<BuilderHeader />);
    expect(
      screen.getByRole("button", { name: /Share/ })
    ).toBeInTheDocument();
  });

  it("renders the New Tool action button", () => {
    render(<BuilderHeader />);
    expect(
      screen.getByRole("button", { name: /New Tool/ })
    ).toBeInTheDocument();
  });
});
