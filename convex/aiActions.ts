"use node";

import { v } from "convex/values";
import { ElevenLabsClient } from "elevenlabs";

import { action } from "./_generated/server";
import { internal } from "./_generated/api";

// Voice IDs verified and audio tested 2026-03-25. All three produce clear therapy-appropriate speech.
const VOICE_MAP: Record<string, string> = {
  "warm-female": "21m00Tcm4TlvDq8ikWAM", // Janet — warm, professional
  "calm-male": "pNInz6obpgDQGcFmaJgB",   // Adam — dominant, firm
  "child-friendly": "hpp4J3VqNfWAUOO0d1Us", // Bella — bright, warm, child-friendly
};

export const generateSpeech = action({
  args: {
    text: v.string(),
    voice: v.optional(v.string()), // friendly name only — raw ElevenLabs IDs not accepted
  },
  handler: async (ctx, args): Promise<{ audioUrl: string }> => {
    // Resolve voice: friendly name -> ID, or default. voiceId arg removed to prevent raw ID passthrough.
    const resolvedVoiceId =
      (args.voice ? VOICE_MAP[args.voice] : undefined) ??
      VOICE_MAP["child-friendly"];

    // Check cache first
    const cached = await ctx.runQuery(internal.ai.getTtsCache, {
      text: args.text,
      voiceId: resolvedVoiceId,
    });

    if (cached) {
      return { audioUrl: cached };
    }

    const elevenLabsApiKey = process.env.ELEVENLABS_API_KEY;
    if (!elevenLabsApiKey) {
      throw new Error("ElevenLabs API key not configured");
    }

    try {
      const client = new ElevenLabsClient({ apiKey: elevenLabsApiKey });
      const audioStream = await client.textToSpeech.convert(resolvedVoiceId, {
        text: args.text,
        modelId: "eleven_flash_v2_5",
        voiceSettings: { stability: 0.5, similarityBoost: 0.75 },
      });

      const audioBuffer = await new Response(audioStream).arrayBuffer();
      const blob = new Blob([audioBuffer], { type: "audio/mpeg" });

      const storageId = await ctx.storage.store(blob);
      const audioUrl = await ctx.storage.getUrl(storageId);

      if (!audioUrl) {
        throw new Error("Failed to get storage URL");
      }

      await ctx.runMutation(internal.ai.saveTtsCache, {
        text: args.text,
        voiceId: resolvedVoiceId,
        audioUrl,
      });

      return { audioUrl };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      console.error("[TTS] Failed:", message);
      throw new Error(
        message.includes("Please try again") ? message : "Speech generation failed. Please try again.",
      );
    }
  },
});
