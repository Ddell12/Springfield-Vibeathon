import { render } from "@testing-library/react";

import { Skeleton } from "../skeleton";

describe("Skeleton", () => {
  it("renders with bg-surface-container-high class instead of bg-accent", () => {
    const { container } = render(<Skeleton />);
    const el = container.firstChild as HTMLElement;
    expect(el.className).toContain("bg-surface-container-high");
    expect(el.className).not.toContain("bg-accent");
  });

  it("merges custom className via cn()", () => {
    const { container } = render(<Skeleton className="h-8 rounded-xl" />);
    const el = container.firstChild as HTMLElement;
    expect(el.className).toContain("h-8");
    expect(el.className).toContain("rounded-xl");
    // Still has the base animate-pulse class
    expect(el.className).toContain("animate-pulse");
  });
});
