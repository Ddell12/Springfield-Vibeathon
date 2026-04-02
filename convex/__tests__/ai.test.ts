/**
 * Tests for convex/ai.ts — TTS cache helpers and AI action contracts.
 *
 * NOTE: This file lives in convex/__tests__/ alongside tools.test.ts.
 * The vitest config currently only includes src/**. The implementer must add
 * "convex/**\/*.test.ts" to the `include` array in vitest.config.ts for these
 * tests to run.
 *
 * External API actions (generateSpeech) call ElevenLabs. Since convex-test
 * runs in a mock runtime that cannot intercept module-level imports of those
 * SDKs, those actions are tested structurally via comment placeholders below.
 * The pure DB helpers (getTtsCache, saveTtsCache) are fully testable.
 *
 * NOTE: generateImage was removed from convex/aiActions.ts. Image generation
 * is now handled by generateTherapyImage in convex/image_generation.ts with
 * Nano Banana Pro (gemini-3-pro-image-preview) and prompt-hash caching.
 */

import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";

import { api } from "../_generated/api";
import schema from "../schema";

// Auto-import all convex modules so the mock runtime can resolve function refs
const modules = import.meta.glob("../**/*.*s");

describe("TTS cache helpers", () => {
  test("getTtsCache returns null on cache miss", async () => {
    const t = convexTest(schema, modules);

    const result = await t.query(api.ai.getTtsCache, {
      text: "hello world",
      voiceId: "default",
    });

    expect(result).toBeNull();
  });

  test("saveTtsCache inserts entry", async () => {
    const t = convexTest(schema, modules);

    // We need a valid storage ID — convex-test allows inserting raw IDs
    // Use t.run to create a cache entry directly via mutation
    await t.mutation(api.ai.saveTtsCache, {
      text: "good morning",
      voiceId: "EXAVITQu4vr4xnSDxMaL",
      audioUrl: "https://storage.convex.cloud/audio/abc123",
    });

    const cached = await t.query(api.ai.getTtsCache, {
      text: "good morning",
      voiceId: "EXAVITQu4vr4xnSDxMaL",
    });

    expect(cached).not.toBeNull();
  });

  test("getTtsCache returns URL on cache hit", async () => {
    const t = convexTest(schema, modules);

    await t.mutation(api.ai.saveTtsCache, {
      text: "I want cookies",
      voiceId: "default",
      audioUrl: "https://storage.convex.cloud/audio/xyz789",
    });

    const url = await t.query(api.ai.getTtsCache, {
      text: "I want cookies",
      voiceId: "default",
    });

    expect(url).toBe("https://storage.convex.cloud/audio/xyz789");
  });
});

/**
 * generateSpeech action — ElevenLabs SDK integration tests
 *
 * convex-test cannot intercept external SDK module imports inside actions,
 * so these tests verify the SDK wiring via vi.mock at the Vitest module level.
 * The mock simulates ElevenLabsClient.textToSpeech.convert returning a stream.
 */

import { beforeEach,vi } from "vitest";

// Use vi.hoisted so mockConvert is available inside the vi.mock factory
const { mockConvert } = vi.hoisted(() => ({
  mockConvert: vi.fn(),
}));

vi.mock("elevenlabs", () => {
  class ElevenLabsClient {
    textToSpeech = { convert: mockConvert };
    constructor(_opts: unknown) {}
  }
  return { ElevenLabsClient };
});

describe("generateSpeech — ElevenLabs SDK wiring", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ELEVENLABS_API_KEY = "test-key";
  });

  test("calls ElevenLabsClient.textToSpeech.convert with correct voice ID and params on cache miss", async () => {
    const t = convexTest(schema, modules);

    // Provide a ReadableStream-like response for the mock
    const audioBytes = new Uint8Array([1, 2, 3, 4]);
    const mockStream = new ReadableStream({
      start(controller) {
        controller.enqueue(audioBytes);
        controller.close();
      },
    });
    mockConvert.mockResolvedValueOnce(mockStream);

    // The action stores audio in Convex storage and returns a URL.
    // In convex-test the storage mock returns a predictable URL.
    await t.action(api.aiActions.generateSpeech, {
      text: "hello therapy world",
      voice: "child-friendly",
    });

    // child-friendly maps to hpp4J3VqNfWAUOO0d1Us
    expect(mockConvert).toHaveBeenCalledOnce();
    expect(mockConvert).toHaveBeenCalledWith("hpp4J3VqNfWAUOO0d1Us", {
      text: "hello therapy world",
      model_id: "eleven_flash_v2_5",
      voice_settings: { stability: 0.5, similarity_boost: 0.75 },
    });
  });

  test("does not call ElevenLabs SDK when audio is already cached", async () => {
    const t = convexTest(schema, modules);

    // Pre-populate cache
    await t.mutation(api.ai.saveTtsCache, {
      text: "cached text",
      voiceId: "hpp4J3VqNfWAUOO0d1Us",
      audioUrl: "https://storage.convex.cloud/audio/cached",
    });

    const result = await t.action(api.aiActions.generateSpeech, {
      text: "cached text",
      voice: "child-friendly",
    });

    expect(mockConvert).not.toHaveBeenCalled();
    expect(result.audioUrl).toBe("https://storage.convex.cloud/audio/cached");
  });
});
