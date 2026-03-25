"use node";

import { anyApi } from "convex/server";
import { v } from "convex/values";

import { action } from "./_generated/server";

export const generateSpeech = action({
  args: {
    text: v.string(),
    voiceId: v.string(),
  },
  handler: async (ctx, args): Promise<{ audioUrl: string }> => {
    // Check cache first
    const cached = await ctx.runQuery(anyApi.ai.getTtsCache, {
      text: args.text,
      voiceId: args.voiceId,
    });

    if (cached) {
      return { audioUrl: cached };
    }

    // Call ElevenLabs TTS API
    const elevenLabsApiKey = process.env.ELEVENLABS_API_KEY;
    if (!elevenLabsApiKey) {
      throw new Error("ElevenLabs API key not configured");
    }

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${args.voiceId}`,
      {
        method: "POST",
        headers: {
          "xi-api-key": elevenLabsApiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: args.text,
          model_id: "eleven_turbo_v2",
          voice_settings: { stability: 0.5, similarity_boost: 0.75 },
        }),
      },
    );

    if (!response.ok) {
      throw new Error(`ElevenLabs API error: ${response.status}`);
    }

    const audioBuffer = await response.arrayBuffer();
    const blob = new Blob([audioBuffer], { type: "audio/mpeg" });

    // Store in Convex file storage
    const storageId = await ctx.storage.store(blob);
    const audioUrl = await ctx.storage.getUrl(storageId);

    if (!audioUrl) {
      throw new Error("Failed to get storage URL");
    }

    // Cache the result
    await ctx.runMutation(anyApi.ai.saveTtsCache, {
      text: args.text,
      voiceId: args.voiceId,
      audioUrl,
    });

    return { audioUrl };
  },
});
