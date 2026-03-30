import { render, screen } from "@testing-library/react";

import { ProductPreview } from "../product-preview";

vi.mock("@/shared/components/material-icon", () => ({
  MaterialIcon: ({ icon }: { icon: string }) => <span>{icon}</span>,
}));

describe("ProductPreview", () => {
  it("renders the section heading", () => {
    render(<ProductPreview />);
    expect(
      screen.getByRole("heading", { name: /Everything you need, all in one place/ })
    ).toBeInTheDocument();
  });

  it("renders the subtitle", () => {
    render(<ProductPreview />);
    expect(
      screen.getByText(/Bridges combines AI-powered tools with therapy expertise/)
    ).toBeInTheDocument();
  });

  it("renders all five feature cards", () => {
    render(<ProductPreview />);
    expect(screen.getByRole("heading", { name: "AI App Builder" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Template Library" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Flashcard Creator" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Speech Coach" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Family Play Mode" })).toBeInTheDocument();
  });

  it("renders feature descriptions", () => {
    render(<ProductPreview />);
    expect(
      screen.getByText(/Describe it in plain language, get a working therapy app/)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Kid-friendly interface with PIN-protected exit/)
    ).toBeInTheDocument();
  });
});
