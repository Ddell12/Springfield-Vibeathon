"use node";

import Anthropic from "@anthropic-ai/sdk";
import { v } from "convex/values";

import { internal } from "./_generated/api";
import { action, internalAction } from "./_generated/server";

// ─── getSignedUrl — client calls this to get a secure WebSocket URL ─────────

export const getSignedUrl = action({
  args: {},
  handler: async (ctx): Promise<{ signedUrl: string }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const apiKey = process.env.ELEVENLABS_API_KEY;
    const agentId = process.env.ELEVENLABS_AGENT_ID;
    if (!apiKey) throw new Error("ELEVENLABS_API_KEY not configured");
    if (!agentId) throw new Error("ELEVENLABS_AGENT_ID not configured");

    const response = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversation/get-signed-url?agent_id=${agentId}`,
      {
        method: "GET",
        headers: { "xi-api-key": apiKey },
      }
    );

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      console.error(`[SpeechCoach] Signed URL error ${response.status}:`, body);
      throw new Error("Failed to start speech coach session. Please try again.");
    }

    const data = (await response.json()) as { signed_url: string };
    return { signedUrl: data.signed_url };
  },
});

// ─── analyzeSession — internal, called by endSession scheduler ──────────────

export const analyzeSession = internalAction({
  args: { sessionId: v.id("speechCoachSessions") },
  handler: async (ctx, args) => {
    // 1. Get the session
    const session = await ctx.runQuery(internal.speechCoach.getSessionById, {
      sessionId: args.sessionId,
    });
    if (!session || !session.conversationId) {
      console.warn("[SpeechCoach] No conversationId, skipping analysis");
      return;
    }

    const apiKey = process.env.ELEVENLABS_API_KEY;
    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey || !anthropicKey) {
      console.error("[SpeechCoach] Missing API keys for analysis");
      return;
    }

    // 2. Fetch transcript from ElevenLabs
    let transcript: string;
    try {
      const response = await fetch(
        `https://api.elevenlabs.io/v1/convai/conversations/${session.conversationId}`,
        {
          method: "GET",
          headers: { "xi-api-key": apiKey },
        }
      );
      if (!response.ok) {
        console.error(`[SpeechCoach] Transcript fetch error ${response.status}`);
        return;
      }
      const data = await response.json();
      transcript = JSON.stringify(data.transcript ?? data, null, 2);
    } catch (error) {
      console.error("[SpeechCoach] Transcript fetch failed:", error);
      return;
    }

    // Skip analysis for very short sessions
    if (transcript.length < 100) {
      console.warn("[SpeechCoach] Transcript too short, skipping analysis");
      return;
    }

    // 3. Store transcript in Convex file storage
    const transcriptBlob = new Blob([transcript], { type: "text/plain" });
    const storageId = await ctx.storage.store(transcriptBlob);
    await ctx.runMutation(internal.speechCoach.setTranscriptStorageId, {
      sessionId: args.sessionId,
      storageId,
    });

    // 4. Analyze with Claude
    const anthropic = new Anthropic({ apiKey: anthropicKey });
    const targetSounds = session.config.targetSounds.join(", ");
    const ageRange = session.config.ageRange;

    const analysisPrompt = `You are analyzing a speech therapy session transcript between a voice coach and a child (age range: ${ageRange}).

The session targeted these sounds: ${targetSounds}
${session.config.focusArea ? `Focus area: ${session.config.focusArea}` : ""}

From the transcript below, determine:
1. Which sounds were actually practiced and how many words were attempted per sound
2. For each sound: approximate success rate (high/medium/low) based on whether the child's responses match target words
3. Overall engagement level (high/medium/low)
4. What sounds should be focused on next session
5. A 2-3 sentence parent-friendly summary. Be encouraging.

TRANSCRIPT:
${transcript}

Respond with a JSON object matching this exact shape:
{
  "soundsAttempted": [{ "sound": "/s/", "wordsAttempted": 8, "approximateSuccessRate": "high", "notes": "..." }],
  "overallEngagement": "high",
  "recommendedNextFocus": ["/r/"],
  "summary": "..."
}`;

    let analysis: {
      soundsAttempted: Array<{
        sound: string;
        wordsAttempted: number;
        approximateSuccessRate: "high" | "medium" | "low";
        notes: string;
      }>;
      overallEngagement: "high" | "medium" | "low";
      recommendedNextFocus: string[];
      summary: string;
    };

    try {
      analysis = await callClaude(anthropic, analysisPrompt);
    } catch (error) {
      console.error("[SpeechCoach] Claude analysis failed, retrying:", error);
      try {
        analysis = await callClaude(anthropic, analysisPrompt);
      } catch (retryError) {
        console.error("[SpeechCoach] Retry also failed:", retryError);
        return;
      }
    }

    // 5. Write progress to Convex
    await ctx.runMutation(internal.speechCoach.saveProgress, {
      sessionId: args.sessionId,
      patientId: session.patientId,
      caregiverUserId: session.caregiverUserId,
      userId: session.userId,
      soundsAttempted: analysis.soundsAttempted,
      overallEngagement: analysis.overallEngagement,
      recommendedNextFocus: analysis.recommendedNextFocus,
      summary: analysis.summary,
      analyzedAt: Date.now(),
    });

    // 6–7. Practice log + goal progress — clinical mode only (requires patient + program)
    if (session.patientId && session.homeProgramId) {
      const sessionDuration = session.startedAt && session.endedAt
        ? Math.round((session.endedAt - session.startedAt) / 60000)
        : undefined;
      const soundsList = analysis.soundsAttempted.map((s) => s.sound).join(", ");

      try {
        await ctx.runMutation(internal.speechCoach.savePracticeLog, {
          homeProgramId: session.homeProgramId,
          patientId: session.patientId,
          caregiverUserId: session.caregiverUserId,
          date: new Date().toISOString().slice(0, 10),
          duration: sessionDuration,
          notes: `Speech Coach session — practiced ${soundsList}`,
        });
      } catch (error) {
        console.error("[SpeechCoach] Practice log write failed:", error);
      }

      const avgAccuracy = computeAverageAccuracy(analysis.soundsAttempted);
      try {
        await ctx.runMutation(internal.speechCoach.saveGoalProgress, {
          homeProgramId: session.homeProgramId,
          patientId: session.patientId,
          sourceId: args.sessionId as string,
          accuracy: avgAccuracy,
          date: new Date().toISOString().slice(0, 10),
        });
      } catch (error) {
        console.error("[SpeechCoach] Goal progress write failed:", error);
      }
    }
  },
});

// ─── Helpers ────────────────────────────────────────────────────────────────

async function callClaude(
  anthropic: Anthropic,
  prompt: string
) {
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    messages: [{ role: "user", content: prompt }],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("No text response from Claude");
  }

  let jsonStr = textBlock.text;
  const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) jsonStr = jsonMatch[1];
  return JSON.parse(jsonStr.trim());
}

function computeAverageAccuracy(
  sounds: Array<{ approximateSuccessRate: "high" | "medium" | "low" }>
): number {
  if (sounds.length === 0) return 0;
  const rateMap = { high: 85, medium: 60, low: 30 };
  const total = sounds.reduce((sum, s) => sum + rateMap[s.approximateSuccessRate], 0);
  return Math.round(total / sounds.length);
}
