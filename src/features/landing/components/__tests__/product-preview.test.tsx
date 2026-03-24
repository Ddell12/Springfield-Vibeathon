import { render, screen } from "@testing-library/react";
import { ProductPreview } from "../product-preview";

vi.mock("@/shared/components/material-icon", () => ({
  MaterialIcon: ({ icon }: { icon: string }) => <span>{icon}</span>,
}));

describe("ProductPreview", () => {
  it("renders the Visual Schedules card with its heading and description", () => {
    render(<ProductPreview />);
    expect(
      screen.getByRole("heading", { name: /Visual Schedules/ })
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /Reduce transition anxiety with step-by-step interactive flows/
      )
    ).toBeInTheDocument();
  });

  it("renders the Communication Boards card with its heading and description", () => {
    render(<ProductPreview />);
    expect(
      screen.getByRole("heading", { name: /Communication Boards/ })
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /Give every child a voice with instant PECS-style boards/
      )
    ).toBeInTheDocument();
  });

  it("renders the MOST POPULAR badge on the Visual Schedules card", () => {
    render(<ProductPreview />);
    expect(screen.getByText("MOST POPULAR")).toBeInTheDocument();
  });
});
