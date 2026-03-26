import { render } from "@testing-library/react";
import { AnimatedGradient } from "../animated-gradient";

describe("AnimatedGradient", () => {
  it("renders without crashing", () => {
    const { container } = render(<AnimatedGradient />);
    expect(container.firstChild).not.toBeNull();
  });

  it("applies custom className to outer div", () => {
    const { container } = render(<AnimatedGradient className="my-custom-class" />);
    const outerDiv = container.firstChild as HTMLElement;
    expect(outerDiv.classList.contains("my-custom-class")).toBe(true);
  });
});
