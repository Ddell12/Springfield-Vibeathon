"use node";

import { v } from "convex/values";

import { action } from "./_generated/server";

export const transcribeSpeech = action({
  args: {
    audioBase64: v.string(),
  },
  handler: async (_ctx, args): Promise<{ transcript: string }> => {
    const elevenLabsApiKey = process.env.ELEVENLABS_API_KEY;
    if (!elevenLabsApiKey) {
      throw new Error("ElevenLabs API key not configured");
    }

    // Max 5MB base64 = ~3.75MB audio
    const MAX_AUDIO_BASE64_LENGTH = 5 * 1024 * 1024;
    if (args.audioBase64.length > MAX_AUDIO_BASE64_LENGTH) {
      throw new Error("Audio too large. Maximum 5MB.");
    }

    const audioBuffer = Buffer.from(args.audioBase64, "base64");
    const blob = new Blob([audioBuffer], { type: "audio/webm" });

    try {
      const formData = new FormData();
      formData.append("file", blob, "audio.webm");
      formData.append("model_id", "scribe_v2");

      const response = await fetch(
        "https://api.elevenlabs.io/v1/speech-to-text",
        {
          method: "POST",
          headers: {
            "xi-api-key": elevenLabsApiKey,
          },
          body: formData,
        },
      );

      if (!response.ok) {
        const body = await response.text().catch(() => "");
        console.error(`[STT] ElevenLabs error ${response.status}:`, body);
        throw new Error("Speech recognition failed. Please try again.");
      }

      const data = (await response.json()) as { text: string; language_code?: string };
      return { transcript: data.text };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      console.error("[STT] Failed:", message);
      throw new Error(
        message.includes("Please try again") ? message : "Speech recognition failed. Please try again.",
      );
    }
  },
});
