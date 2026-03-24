import { render, screen } from "@testing-library/react";

import { SkipToContent } from "../skip-to-content";

describe("SkipToContent", () => {
  it("renders a link with text 'Skip to main content'", () => {
    render(<SkipToContent />);
    const link = screen.getByRole("link", { name: /skip to main content/i });
    expect(link).toBeInTheDocument();
  });

  it("link href points to #main-content", () => {
    render(<SkipToContent />);
    const link = screen.getByRole("link", { name: /skip to main content/i });
    expect(link).toHaveAttribute("href", "#main-content");
  });

  it("link has sr-only class to be visually hidden", () => {
    render(<SkipToContent />);
    const link = screen.getByRole("link", { name: /skip to main content/i });
    expect(link.className).toContain("sr-only");
  });
});
