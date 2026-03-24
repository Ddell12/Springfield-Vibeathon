import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DesignPlan } from "../design-plan";

const SAMPLE_PLAN = `1. **Tool Type** — Token board for positive reinforcement
2. **Design Direction** (3–5 bullets):
- Warm, calming colors with teal accents
- Clean grid layout for easy token tracking
- Bold, child-friendly icons
3. **Features for V1** (4–7 bullets):
- 5 token slots that fill with stars
- Customizable reward label
- Celebration animation on completion
- Large touch targets for tablet use
4. **Child Profile** (inferred): Age 4–6, mild sensory sensitivities, motivated by space theme
Let me build this now.`;

describe("DesignPlan", () => {
  it("renders without crashing on empty content", () => {
    const { container } = render(<DesignPlan content="" />);
    expect(container.firstChild).toBeNull();
  });

  it("renders content when provided", () => {
    render(<DesignPlan content="Some content" />);
    expect(screen.getByText("Some content")).toBeInTheDocument();
  });

  it("detects and renders Tool Type header", () => {
    render(<DesignPlan content="1. **Tool Type** — Token board" />);
    // The header content should appear (without the ** markdown)
    expect(screen.getByText(/Tool Type/)).toBeInTheDocument();
  });

  it("detects and renders Design Direction header", () => {
    render(<DesignPlan content="2. **Design Direction** (3–5 bullets):" />);
    expect(screen.getByText(/Design Direction/)).toBeInTheDocument();
  });

  it("detects and renders Features for V1 header", () => {
    render(<DesignPlan content="3. **Features for V1** (4–7 bullets):" />);
    expect(screen.getByText(/Features for V1/)).toBeInTheDocument();
  });

  it("detects and renders Child Profile header", () => {
    render(<DesignPlan content="4. **Child Profile** (inferred):" />);
    expect(screen.getByText(/Child Profile/)).toBeInTheDocument();
  });

  it("renders bullet points with teal dots", () => {
    render(<DesignPlan content="- Warm, calming colors with teal accents" />);
    const bulletText = screen.getByText("Warm, calming colors with teal accents");
    expect(bulletText).toBeInTheDocument();
    // The bullet dot span should be a sibling
    const bulletContainer = bulletText.closest("div");
    expect(bulletContainer).not.toBeNull();
  });

  it("renders the closing line with divider", () => {
    render(<DesignPlan content="Let me build this now." />);
    expect(screen.getByText("Let me build this now.")).toBeInTheDocument();
  });

  it("renders a full plan with all sections", () => {
    render(<DesignPlan content={SAMPLE_PLAN} />);

    expect(screen.getByText(/Tool Type/)).toBeInTheDocument();
    expect(screen.getByText(/Design Direction/)).toBeInTheDocument();
    expect(screen.getByText(/Features for V1/)).toBeInTheDocument();
    expect(screen.getByText(/Child Profile/)).toBeInTheDocument();
    expect(screen.getByText("Let me build this now.")).toBeInTheDocument();
  });

  it("renders bullet text content without the bullet marker", () => {
    render(<DesignPlan content="- Warm, calming colors with teal accents" />);
    // The text should not include the dash
    const text = screen.getByText("Warm, calming colors with teal accents");
    expect(text.textContent).not.toMatch(/^-/);
  });

  it("strips ** markdown from section headers", () => {
    render(<DesignPlan content="1. **Tool Type** — Token board" />);
    // Should not have ** in the rendered text
    const headerEl = screen.getByText(/Tool Type/);
    expect(headerEl.textContent).not.toContain("**");
  });

  it("handles asterisk bullet style", () => {
    render(<DesignPlan content="* Bold, child-friendly icons" />);
    expect(screen.getByText("Bold, child-friendly icons")).toBeInTheDocument();
  });

  it("handles dash bullet style", () => {
    render(<DesignPlan content="- Large touch targets for tablet use" />);
    expect(screen.getByText("Large touch targets for tablet use")).toBeInTheDocument();
  });

  it("renders plain text lines as paragraphs", () => {
    render(<DesignPlan content="This is a plain text line." />);
    expect(screen.getByText("This is a plain text line.")).toBeInTheDocument();
  });

  it("renders multiple sections without overlap", () => {
    const content = "1. **Tool Type** — Token board\n- Warm colors";
    render(<DesignPlan content={content} />);

    expect(screen.getByText(/Tool Type/)).toBeInTheDocument();
    expect(screen.getByText("Warm colors")).toBeInTheDocument();
  });
});
