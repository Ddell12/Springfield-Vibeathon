import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ActiveSession, getCelebrationMode } from "../active-session";

// LiveKit components are browser-only and don't render meaningfully in jsdom.
vi.mock("@livekit/components-react", () => ({
  LiveKitRoom: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  RoomAudioRenderer: () => null,
}));

// Suppress sonner toast in tests.
vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));

describe("ActiveSession", () => {
  it("shows the target card with listen prompt before the session connects", () => {
    render(
      <ActiveSession
        runtimeSession={{
          runtime: "livekit-agent",
          roomName: "room",
          serverUrl: "wss://x",
          tokenPath: "/api/token",
        }}
        onConversationStarted={() => undefined}
        onEnd={() => undefined}
        durationMinutes={5}
        sessionConfig={{ targetSounds: ["/s/"], ageRange: "2-4", durationMinutes: 5 }}
        speechCoachConfig={undefined}
      />,
    );

    expect(screen.getByText("Current practice")).toBeInTheDocument();
    expect(screen.getByText("Listen carefully")).toBeInTheDocument();
    // correct-attempt feedback only appears after a runtime event — not on initial render
    expect(screen.queryByLabelText("correct-attempt")).toBeNull();
  });
});

describe("getCelebrationMode", () => {
  it("shows fireworks only when the attempt count hits a milestone", () => {
    expect(getCelebrationMode({ totalCorrect: 3 })).toBe("check");
    expect(getCelebrationMode({ totalCorrect: 5 })).toBe("milestone");
  });
});
