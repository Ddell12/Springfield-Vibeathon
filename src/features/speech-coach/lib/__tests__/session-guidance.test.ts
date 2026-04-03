import { describe, expect, it } from "vitest";

import { buildSessionGuidance } from "../session-guidance";

describe("buildSessionGuidance", () => {
  it("includes saved coach setup details in the session guidance", () => {
    const guidance = buildSessionGuidance(
      {
        targetSounds: ["/s/"],
        ageRange: "5-7",
        durationMinutes: 5,
        focusArea: "animal words",
      },
      {
        targetSounds: ["/s/"],
        ageRange: "5-7",
        defaultDurationMinutes: 5,
        coachSetup: {
          targetPositions: ["initial", "final"],
          sessionGoal: "carryover",
          coachTone: "calm",
          sessionPace: "slow",
          promptStyle: "ask-first",
          correctionStyle: "recast",
          maxRetriesPerWord: 1,
          frustrationSupport: "back-off-fast",
          preferredThemes: ["animals"],
          avoidThemes: ["food play"],
          slpNotes: "Keep praise simple.",
        },
      }
    );

    expect(guidance).toContain("Carryover talk");
    expect(guidance).toContain("animals");
    expect(guidance).toContain("food play");
    expect(guidance).toContain("Keep praise simple.");
  });

  it("includes the actual child age when childAge is provided", () => {
    const guidance = buildSessionGuidance(
      {
        targetSounds: ["/s/"],
        ageRange: "5-7",
        durationMinutes: 10,
      },
      {
        targetSounds: ["/s/"],
        ageRange: "5-7",
        defaultDurationMinutes: 10,
        childAge: 8,
      }
    );

    expect(guidance).toContain("Child age: 8 years old.");
  });

  it("falls back to ageRange when childAge is absent", () => {
    const guidance = buildSessionGuidance(
      {
        targetSounds: ["/s/"],
        ageRange: "2-4",
        durationMinutes: 5,
      },
      {
        targetSounds: ["/s/"],
        ageRange: "2-4",
        defaultDurationMinutes: 5,
      }
    );

    expect(guidance).toContain("Child age range: 2-4.");
  });
});
