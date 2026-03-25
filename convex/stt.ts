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

    const audioBuffer = Buffer.from(args.audioBase64, "base64");
    const blob = new Blob([audioBuffer], { type: "audio/webm" });

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
      throw new Error(`ElevenLabs STT error: ${response.status}`);
    }

    const data = (await response.json()) as { text: string; language_code?: string };
    return { transcript: data.text };
  },
});
