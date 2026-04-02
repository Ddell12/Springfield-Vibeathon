import { describe, expect, it } from "vitest";

import { resolveSpeechCoachRuntimeConfig } from "../runtime-config";

describe("resolveSpeechCoachRuntimeConfig", () => {
  it("merges base runtime, template, and child overrides", () => {
    const resolved = resolveSpeechCoachRuntimeConfig({
      template: { name: "Template A", voice: { provider: "elevenlabs", voiceKey: "friendly" } },
      childOverrides: { targetSounds: ["/s/"], promptAddendum: "Use dinosaur words" },
    });

    expect(resolved.targetSounds).toEqual(["/s/"]);
    expect(resolved.voice.voiceKey).toBe("friendly");
    expect(resolved.prompt.childAddendum).toContain("dinosaur");
  });

  it("falls back to template sessionDefaults when child overrides are absent", () => {
    const resolved = resolveSpeechCoachRuntimeConfig({
      template: {
        name: "Template B",
        voice: { provider: "gemini-native", voiceKey: "default" },
        sessionDefaults: { ageRange: "2-4", defaultDurationMinutes: 10 },
      },
      childOverrides: { targetSounds: [] },
    });

    expect(resolved.ageRange).toBe("2-4");
    expect(resolved.durationMinutes).toBe(10);
  });

  it("includes base runtime rules in every resolved config", () => {
    const resolved = resolveSpeechCoachRuntimeConfig({
      template: { name: "T", voice: { provider: "elevenlabs", voiceKey: "k" } },
      childOverrides: { targetSounds: [] },
    });

    expect(resolved.baseRules).toBeDefined();
    expect(resolved.baseRules.safety).toBeTruthy();
  });
});
