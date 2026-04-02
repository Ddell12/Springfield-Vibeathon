import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { CoachSetupTab } from "../coach-setup-tab";
import { SlpSpeechCoachPage } from "../slp-speech-coach-page";

vi.mock("convex/react", () => ({
  useConvexAuth: () => ({ isAuthenticated: true }),
  useMutation: () => vi.fn(),
  useQuery: () => [
    {
      _id: "program1",
      speechCoachConfig: {
        targetSounds: ["/s/"],
        ageRange: "5-7",
        defaultDurationMinutes: 5,
      },
    },
  ],
}));

vi.mock("../../../../convex/_generated/api", () => ({ api: {} }));

const DEFAULT_CONFIG = {
  targetSounds: ["/s/"],
  ageRange: "5-7" as const,
  defaultDurationMinutes: 5,
};

describe("SlpSpeechCoachPage", () => {
  it("renders setup inside the shared route layout instead of local tabs", async () => {
    render(
      <SlpSpeechCoachPage patientId={"patient" as never} homeProgramId={"program1" as never} />
    );
    expect(await screen.findByRole("heading", { name: "Speech Coach" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Template" })).not.toBeInTheDocument();
  });
});

describe("CoachSetupTab", () => {
  it("renders the clinician-facing setup sections", () => {
    render(<CoachSetupTab speechCoachConfig={DEFAULT_CONFIG} onSave={vi.fn()} />);

    expect(screen.getByText("Coach Setup")).toBeInTheDocument();
    expect(screen.getByLabelText("Session goal")).toBeInTheDocument();
    expect(screen.getByLabelText("Coach tone")).toBeInTheDocument();
    expect(screen.getByLabelText("SLP notes")).toBeInTheDocument();
  });

  it("saves clinician notes and theme preferences into coachSetup", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<CoachSetupTab speechCoachConfig={DEFAULT_CONFIG} onSave={onSave} />);

    fireEvent.change(screen.getByLabelText("Preferred themes"), {
      target: { value: "animals, trains" },
    });
    fireEvent.change(screen.getByLabelText("SLP notes"), {
      target: { value: "Use extra wait time." },
    });
    fireEvent.click(screen.getByText("Save Coach Setup"));

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        coachSetup: expect.objectContaining({
          preferredThemes: ["animals", "trains"],
          slpNotes: "Use extra wait time.",
          sessionGoal: "drill",
        }),
      })
    );
  });
});
