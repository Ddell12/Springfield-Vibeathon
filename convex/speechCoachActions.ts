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
      const msg = "Missing API keys for analysis";
      console.error("[SpeechCoach]", msg);
      await ctx.runMutation(internal.speechCoach.markReviewFailed, {
        sessionId: args.sessionId,
        errorMessage: msg,
      });
      return;
    }

    try {
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
          throw new Error(`Transcript fetch error ${response.status}`);
        }
        const data = await response.json();
        transcript = JSON.stringify(data.transcript ?? data, null, 2);
      } catch (error) {
        throw new Error(`Transcript fetch failed: ${String(error)}`);
      }

      // Skip analysis for very short sessions
      if (transcript.length < 100) {
        console.warn("[SpeechCoach] Transcript too short, skipping analysis");
        return;
      }

      // 3. Store transcript in Convex file storage and mark transcript_ready
      const transcriptBlob = new Blob([transcript], { type: "text/plain" });
      const storageId = await ctx.storage.store(transcriptBlob);
      await ctx.runMutation(internal.speechCoach.markTranscriptReady, {
        sessionId: args.sessionId,
        storageId,
      });

      // 4. Mark analyzing (increments analysisAttempts)
      await ctx.runMutation(internal.speechCoach.markAnalyzing, {
        sessionId: args.sessionId,
      });

      // 5. Analyze with Claude
      const anthropic = new Anthropic({ apiKey: anthropicKey });
      const targetSounds = session.config.targetSounds.join(", ");
      const ageRange = session.config.ageRange;

      const runtimeSnapshot = session.config.runtimeSnapshot;
      const analysisPrompt = `You are analyzing a speech therapy session transcript between a voice coach and a child (age range: ${ageRange}).

The session targeted these sounds: ${targetSounds}
${session.config.focusArea ? `Focus area: ${session.config.focusArea}` : ""}
Voice provider: ${runtimeSnapshot?.voiceProvider ?? "unknown"}
Enabled tools: ${(runtimeSnapshot?.tools ?? []).join(", ") || "none"}
Enabled skills: ${(runtimeSnapshot?.skills ?? []).join(", ") || "none"}

From the transcript below, produce a detailed analysis for the caregiver.

TRANSCRIPT:
${transcript}

Respond with a JSON object matching this EXACT shape (no extra keys, no markdown fences):
{
  "transcriptTurns": [
    {
      "speaker": "coach",
      "text": "Say sad",
      "targetItemId": "sad",
      "targetLabel": "sad",
      "attemptOutcome": "incorrect",
      "retryCount": 0,
      "timestampMs": 1200
    }
  ],
  "scoreCards": {
    "overall": 72,
    "productionAccuracy": 68,
    "consistency": 70,
    "cueingSupport": 55,
    "engagement": 80
  },
  "insights": {
    "strengths": ["..."],
    "patterns": ["..."],
    "notableCueingPatterns": ["..."],
    "recommendedNextTargets": ["/s/"],
    "homePracticeNotes": ["..."]
  },
  "soundsAttempted": [{ "sound": "/s/", "wordsAttempted": 8, "approximateSuccessRate": "high", "notes": "..." }],
  "overallEngagement": "high",
  "recommendedNextFocus": ["/r/"],
  "summary": "A 2-3 sentence parent-friendly summary. Be encouraging."
}

Rules for transcriptTurns:
- speaker must be "coach", "child", or "system"
- attemptOutcome must be "correct", "approximate", "incorrect", or "no_response" (omit if not applicable)
- retryCount and timestampMs are required numbers (use 0 if unknown)

Rules for scoreCards: all values are 0-100 integers.
Rules for overallEngagement: must be "high", "medium", or "low".`;

      let analysis: {
        transcriptTurns?: Array<{
          speaker: "coach" | "child" | "system";
          text: string;
          targetItemId?: string;
          targetLabel?: string;
          attemptOutcome?: "correct" | "approximate" | "incorrect" | "no_response";
          retryCount: number;
          timestampMs: number;
        }>;
        scoreCards?: {
          overall: number;
          productionAccuracy: number;
          consistency: number;
          cueingSupport: number;
          engagement: number;
        };
        insights?: {
          strengths: string[];
          patterns: string[];
          notableCueingPatterns: string[];
          recommendedNextTargets: string[];
          homePracticeNotes: string[];
        };
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
        analysis = await callClaude(anthropic, analysisPrompt);
      }

      // 6. Write progress to Convex (saveProgress also sets status to "analyzed")
      await ctx.runMutation(internal.speechCoach.saveProgress, {
        sessionId: args.sessionId,
        patientId: session.patientId,
        caregiverUserId: session.caregiverUserId,
        userId: session.userId,
        transcriptTurns: analysis.transcriptTurns,
        scoreCards: analysis.scoreCards,
        insights: analysis.insights,
        soundsAttempted: analysis.soundsAttempted,
        overallEngagement: analysis.overallEngagement,
        recommendedNextFocus: analysis.recommendedNextFocus,
        summary: analysis.summary,
        analyzedAt: Date.now(),
      });

      // 7. Practice log + goal progress — clinical mode only (requires patient + program)
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
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error("[SpeechCoach] analyzeSession failed:", errorMessage);
      await ctx.runMutation(internal.speechCoach.markReviewFailed, {
        sessionId: args.sessionId,
        errorMessage,
      });
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
