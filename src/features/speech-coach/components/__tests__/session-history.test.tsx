import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { Id } from "../../../../../convex/_generated/dataModel";
import { SessionHistory } from "../session-history";

const mockUseQuery = vi.fn();
const mockRetryReview = vi.fn();

vi.mock("convex/react", () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
  useMutation: () => mockRetryReview,
}));

const SESSION_ID = "speechCoachSessions_1" as Id<"speechCoachSessions">;

const REVIEW_FAILED_SESSION = {
  _id: SESSION_ID,
  _creationTime: 1700000000000,
  startedAt: 1700000000000,
  endedAt: 1700003600000,
  status: "review_failed",
  config: {
    targetSounds: ["/s/"],
    durationMinutes: 10,
    patientName: "Ace",
    runtimeSnapshot: { templateVersion: "1.0", voiceKey: "echo" },
  },
};

describe("SessionHistory", () => {
  const patientId = "patients_1" as Id<"patients">;

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("shows retry review when a session is review_failed but transcript exists", async () => {
    // Discriminate calls by args:
    // - getSessionHistory receives { patientId } → return session list
    // - getStandaloneHistory receives "skip" → return undefined (skipped)
    // - getSessionDetail receives { sessionId } → return detail
    mockUseQuery.mockImplementation((_queryRef: unknown, args: unknown) => {
      if (args === "skip") return undefined;
      if (args && typeof args === "object" && "sessionId" in args) {
        return { session: REVIEW_FAILED_SESSION, progress: null };
      }
      return [REVIEW_FAILED_SESSION];
    });

    render(<SessionHistory patientId={patientId} />);

    // Click to expand the session row
    const button = await screen.findByRole("button");
    fireEvent.click(button);

    expect(await screen.findByText("Retry review")).toBeInTheDocument();
    expect(screen.getByText("Transcript available while review is retried.")).toBeInTheDocument();
  });
});
