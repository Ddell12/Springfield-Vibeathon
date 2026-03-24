import { render, screen } from "@testing-library/react";
import { MaterialIcon } from "../material-icon";

describe("MaterialIcon", () => {
  it("renders the icon text content", () => {
    render(<MaterialIcon icon="home" />);
    expect(screen.getByText("home")).toBeInTheDocument();
  });

  it("applies the default md size class", () => {
    render(<MaterialIcon icon="star" />);
    const el = screen.getByText("star");
    expect(el.className).toContain("text-2xl");
  });

  it("applies the correct class for each size", () => {
    const { rerender } = render(<MaterialIcon icon="star" size="sm" />);
    expect(screen.getByText("star").className).toContain("text-lg");

    rerender(<MaterialIcon icon="star" size="lg" />);
    expect(screen.getByText("star").className).toContain("text-3xl");

    rerender(<MaterialIcon icon="star" size="xl" />);
    expect(screen.getByText("star").className).toContain("text-4xl");
  });

  it("sets FILL 1 when filled is true", () => {
    render(<MaterialIcon icon="favorite" filled />);
    const el = screen.getByText("favorite");
    expect(el.style.fontVariationSettings).toContain("'FILL' 1");
  });

  it("sets FILL 0 by default when filled is not provided", () => {
    render(<MaterialIcon icon="favorite" />);
    const el = screen.getByText("favorite");
    expect(el.style.fontVariationSettings).toContain("'FILL' 0");
  });

  it("merges a custom className", () => {
    render(<MaterialIcon icon="check" className="text-red-500" />);
    const el = screen.getByText("check");
    expect(el.className).toContain("text-red-500");
    expect(el.className).toContain("material-symbols-outlined");
  });
});
