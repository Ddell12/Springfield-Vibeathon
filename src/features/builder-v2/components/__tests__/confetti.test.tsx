import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { Confetti } from "../confetti";

// Stub motion/react since animations don't run in jsdom
vi.mock("motion/react", () => ({
  motion: {
    div: ({ children, className, style }: { children?: React.ReactNode; className?: string; style?: React.CSSProperties }) => (
      <div className={className} style={style}>{children}</div>
    ),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

describe("Confetti", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders nothing when trigger is false", () => {
    const { container } = render(<Confetti trigger={false} />);
    // No confetti particles should be in the DOM
    const particles = container.querySelectorAll("[data-testid='confetti-particle'], .confetti-particle");
    expect(particles.length).toBe(0);
  });

  it("renders particles when trigger is true", () => {
    const { container } = render(<Confetti trigger={true} />);
    // Should render multiple confetti particles
    const particles = container.querySelectorAll(
      "[data-testid='confetti-particle'], .confetti-particle, [class*='confetti']"
    );
    expect(particles.length).toBeGreaterThan(0);
  });

  it("removes particles after 2000ms", () => {
    const { container } = render(<Confetti trigger={true} />);

    // Particles are present initially
    const particlesBefore = container.querySelectorAll(
      "[data-testid='confetti-particle'], .confetti-particle, [class*='confetti']"
    );
    expect(particlesBefore.length).toBeGreaterThan(0);

    // Advance time past the 2-second duration
    act(() => {
      vi.advanceTimersByTime(2100);
    });

    // Particles should be gone (component clears itself)
    const particlesAfter = container.querySelectorAll(
      "[data-testid='confetti-particle'], .confetti-particle, [class*='confetti']"
    );
    expect(particlesAfter.length).toBe(0);
  });

  it("does not crash when trigger transitions from false to true", () => {
    const { rerender } = render(<Confetti trigger={false} />);
    expect(() => {
      rerender(<Confetti trigger={true} />);
    }).not.toThrow();
  });

  it("does not crash when trigger transitions from true to false", () => {
    const { rerender } = render(<Confetti trigger={true} />);
    expect(() => {
      rerender(<Confetti trigger={false} />);
    }).not.toThrow();
  });
});
