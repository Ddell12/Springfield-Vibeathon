import { http, HttpResponse } from "msw";

export const handlers = [
  // Claude API mock
  http.post("https://api.anthropic.com/v1/messages", () => {
    return HttpResponse.json({
      content: [{ type: "text", text: "Mock response from Claude" }],
      model: "claude-sonnet-4-20250514",
      role: "assistant",
    });
  }),

  // Google Embeddings mock
  http.post("https://generativelanguage.googleapis.com/*", () => {
    return HttpResponse.json({
      embedding: { values: new Array(768).fill(0.1) },
    });
  }),

  // ElevenLabs TTS mock
  http.post("https://api.elevenlabs.io/v1/text-to-speech/*", () => {
    return new HttpResponse(new ArrayBuffer(100), {
      headers: { "Content-Type": "audio/mpeg" },
    });
  }),
];
