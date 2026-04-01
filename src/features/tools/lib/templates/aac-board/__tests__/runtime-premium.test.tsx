import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("convex/react", () => ({
  useMutation: vi.fn(() => vi.fn().mockResolvedValue(undefined)),
}));
vi.mock("@convex/_generated/api", () => ({ api: { tools: { logEvent: "tools:logEvent" } } }));

import { AACBoardRuntime } from "../runtime";
import type { AACBoardConfig } from "../schema";

const MOCK_VOICE = {
  speak: vi.fn().mockResolvedValue(undefined),
  stop: vi.fn(),
  status: "idle" as const,
};

const aacConfig: AACBoardConfig = {
  title: "My Communication Board",
  gridCols: 3,
  gridRows: 2,
  buttons: [
    { id: "1", label: "Yes", speakText: "Yes" },
    { id: "2", label: "No", speakText: "No" },
  ],
  showTextLabels: true,
  autoSpeak: false,
  voice: "child-friendly",
  highContrast: false,
};

describe("AAC board runtime premium", () => {
  it("renders the app title", () => {
    render(
      <AACBoardRuntime
        config={aacConfig}
        mode="preview"
        onEvent={vi.fn()}
        voice={MOCK_VOICE}
      />
    );
    expect(screen.getByText(aacConfig.title)).toBeInTheDocument();
  });

  it("does not invoke voice.speak when autoSpeak is false", () => {
    const voiceMock = {
      speak: vi.fn().mockResolvedValue(undefined),
      stop: vi.fn(),
      status: "idle" as const,
    };
    render(
      <AACBoardRuntime
        config={{ ...aacConfig, autoSpeak: false }}
        mode="preview"
        onEvent={vi.fn()}
        voice={voiceMock}
      />
    );
    // Mounting alone should not trigger speak
    expect(voiceMock.speak).not.toHaveBeenCalled();
  });
});
