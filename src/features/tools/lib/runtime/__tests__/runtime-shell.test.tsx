import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { RuntimeShell } from "../runtime-shell";

describe("RuntimeShell", () => {
  it("renders 'Live preview' label in preview mode", () => {
    render(
      <RuntimeShell mode="preview" onExit={vi.fn()}>
        <div>content</div>
      </RuntimeShell>
    );
    expect(screen.getByText("Live preview")).toBeInTheDocument();
  });

  it("renders 'Published app' label in published mode", () => {
    render(
      <RuntimeShell mode="published" onExit={vi.fn()}>
        <div>content</div>
      </RuntimeShell>
    );
    expect(screen.getByText("Published app")).toBeInTheDocument();
  });

  it("renders an Exit button", () => {
    render(
      <RuntimeShell mode="preview" onExit={vi.fn()}>
        <div>content</div>
      </RuntimeShell>
    );
    expect(screen.getByRole("button", { name: /exit/i })).toBeInTheDocument();
  });
});
