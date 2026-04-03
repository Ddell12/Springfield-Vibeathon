import { describe, expect, it, vi } from "vitest";

vi.mock("@convex-dev/auth/nextjs/server", () => ({
  convexAuthNextjsToken: vi.fn().mockResolvedValue("fake-token"),
}));

vi.mock("ai", () => ({
  generateText: vi.fn().mockResolvedValue({
    output: {
      title: "Snack Requests",
      gridCols: 3,
      gridRows: 2,
      buttons: [{ id: "1", label: "Crackers", speakText: "I want crackers" }],
      showTextLabels: true,
      autoSpeak: true,
      voice: "child-friendly",
      highContrast: false,
    },
  }),
  Output: {
    object: vi.fn(({ schema }) => ({ schema })),
  },
}));

import { POST } from "../route";

describe("POST /api/tools/generate-config", () => {
  it("returns structured config JSON for a known template", async () => {
    const req = new Request("http://localhost/api/tools/generate-config", {
      method: "POST",
      body: JSON.stringify({
        templateType: "aac_board",
        description: "Snack request board for clinic sessions",
        childProfile: {},
        generationProfile: {
          targetSetting: "clinic",
          interactionRichness: "high",
          voicePreference: "elevenlabs-first",
          sensoryMode: "calm",
        },
      }),
    });

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.configJson).toContain("\"Snack Requests\"");
  });
});
