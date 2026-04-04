import { afterEach, describe, expect, it, vi } from "vitest";

import { shouldBypassSpeechCoachMicrophoneCheck } from "../microphone-gate";

describe("shouldBypassSpeechCoachMicrophoneCheck", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns false by default", () => {
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("NEXT_PUBLIC_E2E_BYPASS_MIC_CHECK", undefined);

    expect(shouldBypassSpeechCoachMicrophoneCheck()).toBe(false);
  });

  it("returns true when the explicit e2e flag is enabled outside production", () => {
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("NEXT_PUBLIC_E2E_BYPASS_MIC_CHECK", "1");

    expect(shouldBypassSpeechCoachMicrophoneCheck()).toBe(true);
  });

  it("stays false in production even if the flag is enabled", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_E2E_BYPASS_MIC_CHECK", "1");

    expect(shouldBypassSpeechCoachMicrophoneCheck()).toBe(false);
  });
});
