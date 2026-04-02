import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { templateRegistry } from "@/features/tools/lib/registry";
import { PreviewPanel } from "../preview-panel";

vi.mock("@/features/tools/lib/runtime/runtime-voice-controller", () => ({
  useVoiceController: () => ({
    speak: vi.fn().mockResolvedValue(undefined),
    stop: vi.fn(),
    status: "idle" as const,
  }),
}));

describe("PreviewPanel", () => {
  it("opens in-app fullscreen mode when Full screen button is clicked", () => {
    render(
      <PreviewPanel
        templateType="aac_board"
        config={templateRegistry.aac_board.defaultConfig}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: "Full screen" }));
    expect(screen.getByRole("button", { name: "Exit full screen" })).toBeInTheDocument();
  });

  it("shows Browser fullscreen button when in fullscreen mode", () => {
    render(
      <PreviewPanel
        templateType="aac_board"
        config={templateRegistry.aac_board.defaultConfig}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: "Full screen" }));
    expect(screen.getByRole("button", { name: "Browser fullscreen" })).toBeInTheDocument();
  });
});
