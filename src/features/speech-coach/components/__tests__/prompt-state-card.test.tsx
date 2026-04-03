import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PromptStateCard } from "../prompt-state-card";

describe("PromptStateCard", () => {
  it("renders the listen state by default", () => {
    render(<PromptStateCard state="listen" reducedMotion={false} />);
    expect(screen.getByText("Listen carefully")).toBeInTheDocument();
  });

  it("renders your_turn state", () => {
    render(<PromptStateCard state="your_turn" reducedMotion={false} />);
    expect(screen.getByText("Your turn!")).toBeInTheDocument();
  });

  it("renders try_again state", () => {
    render(<PromptStateCard state="try_again" reducedMotion={false} />);
    expect(screen.getByText("Try again")).toBeInTheDocument();
  });

  it("renders nice_job state", () => {
    render(<PromptStateCard state="nice_job" reducedMotion={false} />);
    expect(screen.getByText("Nice job!")).toBeInTheDocument();
  });

  it("does not apply transition class when reducedMotion is true", () => {
    const { container } = render(<PromptStateCard state="listen" reducedMotion={true} />);
    expect(container.firstChild).not.toHaveClass("transition-colors");
  });
});
