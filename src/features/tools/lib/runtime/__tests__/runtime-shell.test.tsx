import { act, fireEvent, render, renderHook, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { DEFAULT_APP_SHELL } from "../app-shell-types";
import { RuntimeShell } from "../runtime-shell";
import { useAppShellState } from "../use-app-shell-state";

describe("RuntimeShell", () => {
  it("renders 'Live preview' label in preview mode", () => {
    render(
      <RuntimeShell mode="preview" shell={DEFAULT_APP_SHELL} title="Test App" onExit={vi.fn()}>
        <div>content</div>
      </RuntimeShell>
    );
    expect(screen.getByText("Live preview")).toBeInTheDocument();
  });

  it("renders 'Published app' label in published mode", () => {
    render(
      <RuntimeShell mode="published" shell={DEFAULT_APP_SHELL} title="Test App" onExit={vi.fn()}>
        <div>content</div>
      </RuntimeShell>
    );
    expect(screen.getByText("Published app")).toBeInTheDocument();
  });

  it("renders an Exit button", () => {
    render(
      <RuntimeShell mode="preview" shell={DEFAULT_APP_SHELL} title="Test App" onExit={vi.fn()}>
        <div>content</div>
      </RuntimeShell>
    );
    expect(screen.getByRole("button", { name: /exit/i })).toBeInTheDocument();
  });

  it("persists difficulty and sound settings across rerenders", async () => {
    const { result, rerender } = renderHook(() =>
      useAppShellState({
        storageKey: "tool-preview-aac",
        shell: DEFAULT_APP_SHELL,
      })
    );

    act(() => result.current.setDifficulty("hard"));
    act(() => result.current.setSoundsEnabled(false));
    rerender();

    expect(result.current.difficulty).toBe("hard");
    expect(result.current.soundsEnabled).toBe(false);
  });

  it("shows instructions when the shell provides them", () => {
    render(
      <RuntimeShell
        mode="preview"
        shell={{ ...DEFAULT_APP_SHELL, instructionsText: "Tap the picture to begin." }}
        title="Test App"
        onExit={vi.fn()}
      >
        <div>content</div>
      </RuntimeShell>
    );

    fireEvent.click(screen.getByRole("button", { name: /open instructions/i }));

    expect(screen.getByText("How to use this app")).toBeInTheDocument();
    expect(screen.getByText("Tap the picture to begin.")).toBeInTheDocument();
  });
});
