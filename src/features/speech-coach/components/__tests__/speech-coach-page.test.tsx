import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { SpeechCoachPage } from "../speech-coach-page";

vi.mock("convex/react", () => ({
  useConvexAuth: () => ({ isAuthenticated: true }),
  useQuery: (_: unknown, args: unknown) => {
    if (args === "skip") return undefined;
    // Return a program with NO speechCoachConfig
    return [{ _id: "program1" }];
  },
  useMutation: () => vi.fn(),
  useAction: () => vi.fn(),
}));

vi.mock("../../../../convex/_generated/api", () => ({ api: {} }));

vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode; [key: string]: unknown }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("../hooks/use-speech-session", () => ({
  useSpeechSession: () => ({
    phase: "idle",
    runtimeSession: null,
    sessionConfig: null,
    durationMinutes: 5,
    begin: vi.fn(),
    markActive: vi.fn(),
    endSession: vi.fn(),
    reset: vi.fn(),
    error: null,
  }),
}));

vi.mock("../session-history", () => ({
  SessionHistory: () => <div data-testid="session-history" />,
}));

vi.mock("../session-config", () => ({
  SessionConfig: () => <div data-testid="session-config" />,
}));

describe("SpeechCoachPage — no speechCoachConfig", () => {
  it("links incomplete setup forward to Setup and Templates", async () => {
    render(
      <SpeechCoachPage
        patientId={"patient" as never}
        homeProgramId={"program1" as never}
      />
    );
    expect(
      await screen.findByRole("link", { name: "Open setup" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Browse templates" })
    ).toBeInTheDocument();
  });
});
