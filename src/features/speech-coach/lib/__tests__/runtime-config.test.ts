import { describe, expect, it } from "vitest";

import {
  buildSpeechCoachRuntimeInstructions,
  resolveSpeechCoachRuntimeConfig,
} from "../runtime-config";

describe("clinical protocol prompt", () => {
  it("includes the cueing hierarchy in all instructions", () => {
    const resolved = resolveSpeechCoachRuntimeConfig({
      template: { name: "T", voice: { provider: "elevenlabs", voiceKey: "k" } },
      childOverrides: { targetSounds: ["/s/"] },
    });
    const instructions = buildSpeechCoachRuntimeInstructions({ resolvedConfig: resolved });
    expect(instructions).toContain("CUEING HIERARCHY");
    expect(instructions).toContain("Elicit spontaneously");
  });

  it("includes wait time guidance for autism", () => {
    const resolved = resolveSpeechCoachRuntimeConfig({
      template: { name: "T", voice: { provider: "elevenlabs", voiceKey: "k" } },
      childOverrides: { targetSounds: ["/s/"] },
    });
    const instructions = buildSpeechCoachRuntimeInstructions({ resolvedConfig: resolved });
    expect(instructions).toContain("5-10");
  });

  it("injects enabled skill clinical modules", () => {
    const resolved = resolveSpeechCoachRuntimeConfig({
      template: {
        name: "T",
        voice: { provider: "elevenlabs", voiceKey: "k" },
        skills: [
          { key: "auditory-bombardment", enabled: true },
          { key: "carryover-conversation", enabled: false },
        ],
      },
      childOverrides: { targetSounds: ["/s/"] },
    });
    const instructions = buildSpeechCoachRuntimeInstructions({ resolvedConfig: resolved });
    expect(instructions).toContain("5-8 times");          // auditory-bombardment text
    expect(instructions).not.toContain("Embed target words naturally in simple conversation"); // disabled skill
  });

  it("includes tool call instructions", () => {
    const resolved = resolveSpeechCoachRuntimeConfig({
      template: { name: "T", voice: { provider: "elevenlabs", voiceKey: "k" } },
      childOverrides: { targetSounds: ["/s/"] },
    });
    const instructions = buildSpeechCoachRuntimeInstructions({ resolvedConfig: resolved });
    expect(instructions).toContain("signal_state");
    expect(instructions).toContain("log_attempt");
  });
});

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

  it("builds runtime instructions with prompt layers and session guidance", () => {
    const resolved = resolveSpeechCoachRuntimeConfig({
      template: {
        name: "Template C",
        voice: { provider: "elevenlabs", voiceKey: "friendly" },
        prompt: {
          baseExtension: "Stay playful.",
          coachingStyle: "Use short turns.",
        },
        customKnowledgeSnippets: ["Use animal words first."],
      },
      childOverrides: { targetSounds: ["/s/"], promptAddendum: "Avoid food topics." },
    });

    const instructions = buildSpeechCoachRuntimeInstructions({
      resolvedConfig: resolved,
      sessionGuidance: "Session goal: Carryover talk.",
    });

    expect(instructions).toContain("Vocali Speech Coach");
    expect(instructions).toContain("Stay playful.");
    expect(instructions).toContain("Avoid food topics.");
    expect(instructions).toContain("Session goal: Carryover talk.");
  });
});
