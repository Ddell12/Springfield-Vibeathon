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
 * generateSpeech action (convex/ai.ts)
 * ─────────────────────────────────────
 * Contract (to be verified by the implementer via manual test or MSW):
 *
 * 1. On cache hit — returns the cached audioUrl without calling ElevenLabs.
 * 2. On cache miss — calls ElevenLabs /v1/text-to-speech/{voiceId},
 *    stores the result in Convex file storage, saves to ttsCache table,
 *    and returns the new storage URL.
 * 3. On ElevenLabs failure — throws an error with a user-friendly message.
 *
 * Args: { text: string; voiceId: string }
 * Returns: { audioUrl: string }
 *
 */
