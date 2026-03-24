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

export const generateImage = action({
  args: {
    label: v.string(),
    category: v.string(),
  },
  handler: async (ctx, args): Promise<{ imageUrl: string }> => {
    const googleApiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!googleApiKey) {
      throw new Error("Google API key not configured");
    }

    const prompt = `Simple, clear illustration of ${args.label}, flat design, bold outlines, white background, child-friendly`;

    // Call Google Imagen via REST API
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${googleApiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instances: [{ prompt }],
          parameters: { sampleCount: 1 },
        }),
      },
    );

    if (!response.ok) {
      throw new Error(`Google Imagen API error: ${response.status}`);
    }

    const data = (await response.json()) as {
      predictions: Array<{ bytesBase64Encoded: string; mimeType: string }>;
    };
    const prediction = data.predictions[0];
    if (!prediction) {
      throw new Error("No image generated");
    }

    const imageBuffer = Buffer.from(prediction.bytesBase64Encoded, "base64");
    const blob = new Blob([imageBuffer], {
      type: prediction.mimeType ?? "image/png",
    });

    const storageId = await ctx.storage.store(blob);
    const imageUrl = await ctx.storage.getUrl(storageId);

    if (!imageUrl) {
      throw new Error("Failed to get image URL");
    }

    return { imageUrl };
  },
});
