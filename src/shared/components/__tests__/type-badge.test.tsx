import { render, screen } from "@testing-library/react";
import { TypeBadge } from "../type-badge";

describe("TypeBadge", () => {
  it("renders the correct label for communication-board", () => {
    render(<TypeBadge type="communication-board" />);
    expect(screen.getByText("Communication Board")).toBeInTheDocument();
  });

  it("renders the correct label for token-board", () => {
    render(<TypeBadge type="token-board" />);
    expect(screen.getByText("Token Board")).toBeInTheDocument();
  });

  it("renders the correct label for visual-schedule", () => {
    render(<TypeBadge type="visual-schedule" />);
    expect(screen.getByText("Visual Schedule")).toBeInTheDocument();
  });

  it("renders the raw type string for unknown types", () => {
    render(<TypeBadge type="custom-unknown-type" />);
    expect(screen.getByText("custom-unknown-type")).toBeInTheDocument();
  });

  it("merges a custom className", () => {
    render(<TypeBadge type="token-board" className="mt-4" />);
    const el = screen.getByText("Token Board");
    expect(el.className).toContain("mt-4");
    expect(el.className).toContain("rounded-full");
  });
});
