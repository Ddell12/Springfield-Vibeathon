import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { CompletionMessage } from "../completion-message";
import type { FragmentResult } from "../../lib/schema";

const baseFragment: FragmentResult = {
  title: "Morning Routine Chart",
  description: "A visual schedule to help with morning transitions.",
  template: "nextjs-developer",
  code: '"use client";\nexport default function App() { return <div />; }',
  file_path: "pages/index.tsx",
  has_additional_dependencies: false,
  port: 3000,
};

describe("CompletionMessage", () => {
  it("renders the fragment title in the heading", () => {
    render(<CompletionMessage fragment={baseFragment} />);
    expect(
      screen.getByText(/Morning Routine Chart is ready!/i)
    ).toBeInTheDocument();
  });

  it("renders the fragment description", () => {
    render(<CompletionMessage fragment={baseFragment} />);
    expect(
      screen.getByText(/A visual schedule to help with morning transitions/i)
    ).toBeInTheDocument();
  });

  it("renders the 'What's next?' section heading", () => {
    render(<CompletionMessage fragment={baseFragment} />);
    expect(screen.getByText(/what.s next/i)).toBeInTheDocument();
  });

  it("renders all three tip labels", () => {
    render(<CompletionMessage fragment={baseFragment} />);
    expect(screen.getByText("Customize")).toBeInTheDocument();
    expect(screen.getByText("Share")).toBeInTheDocument();
    expect(screen.getByText("Try it")).toBeInTheDocument();
  });

  it("renders Customize tip description", () => {
    render(<CompletionMessage fragment={baseFragment} />);
    expect(
      screen.getByText(/Tell me what to change/i)
    ).toBeInTheDocument();
  });

  it("renders Share tip description", () => {
    render(<CompletionMessage fragment={baseFragment} />);
    expect(
      screen.getByText(/Tap the Share button/i)
    ).toBeInTheDocument();
  });

  it("renders Try it tip description", () => {
    render(<CompletionMessage fragment={baseFragment} />);
    expect(
      screen.getByText(/Interact with your tool in the preview/i)
    ).toBeInTheDocument();
  });

  it("calls onConfetti callback when rendered", () => {
    const onConfetti = vi.fn();
    render(<CompletionMessage fragment={baseFragment} onConfetti={onConfetti} />);
    expect(onConfetti).toHaveBeenCalledTimes(1);
  });

  it("does not crash when onConfetti is not provided", () => {
    expect(() => {
      render(<CompletionMessage fragment={baseFragment} />);
    }).not.toThrow();
  });
});
