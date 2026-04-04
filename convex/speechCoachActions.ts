"use node";

import Anthropic from "@anthropic-ai/sdk";
import { ConvexError, v } from "convex/values";

import { api, internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import type { ActionCtx } from "./_generated/server";
import { action, internalAction } from "./_generated/server";

const DEFAULT_RUNTIME_PROVIDER = "livekit";

type AnalysisInput = {
  transcript: string;
  rawTranscriptTurns?: Array<{
    speaker: "coach" | "child" | "system";
    text: string;
    timestampMs: number;
  }>;
};

type AnalysisResult = {
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
  positionAccuracy?: Array<{
    sound: string;
    position: "initial" | "medial" | "final" | "unknown";
    correct: number;
    total: number;
  }>;
  iepNoteDraft?: string;
};

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

export const getTranscriptText = action({
  args: { sessionId: v.id("speechCoachSessions") },
  handler: async (ctx, args): Promise<{ transcript: string }> => {
    const detail = await ctx.runQuery(api.speechCoach.getSessionDetail, { sessionId: args.sessionId });
    if (!detail.session.transcriptStorageId) {
      throw new ConvexError("Transcript not available yet");
    }

    const blob = await ctx.storage.get(detail.session.transcriptStorageId);
    if (!blob) throw new ConvexError("Transcript file is missing");

    return { transcript: await blob.text() };
  },
});

export const analyzeSession = internalAction({
  args: { sessionId: v.id("speechCoachSessions") },
  handler: async (ctx, args) => {
    const session = await ctx.runQuery(internal.speechCoach_lifecycle.getSessionById, {
      sessionId: args.sessionId,
    });
    if (!session) {
      console.warn("[SpeechCoach] Session missing, skipping analysis");
      return;
    }

    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    if (!anthropicKey) {
      const msg = "Missing ANTHROPIC_API_KEY for analysis";
      console.error("[SpeechCoach]", msg);
      await ctx.runMutation(internal.speechCoach_lifecycle.markReviewFailed, {
        sessionId: args.sessionId,
        errorMessage: msg,
      });
      return;
    }

    try {
      const runtimeProvider = session.runtimeProvider ?? DEFAULT_RUNTIME_PROVIDER;
      const analysisInput = runtimeProvider === "elevenlabs"
        ? await loadElevenLabsTranscript(ctx, session)
        : await loadStoredTranscript(ctx, session);

      // Raise minimum: 300 chars OR 3 logged attempts (OR condition)
      const hasRawAttempts = (session.rawAttempts?.length ?? 0) >= 3;
      const hasMinTranscript = analysisInput.transcript.trim().length >= 300;

      if (!hasRawAttempts && !hasMinTranscript) {
        await ctx.runMutation(internal.speechCoach_lifecycle.markReviewFailed, {
          sessionId: args.sessionId,
          errorMessage: "Session too short to analyze (less than 300 chars of transcript and fewer than 3 logged attempts)",
        });
        return;
      }

      const anthropic = new Anthropic({ apiKey: anthropicKey });

      // Always: caregiver analysis
      const caregiverPrompt = buildCaregiverAnalysisPrompt(session, analysisInput);
      let caregiverResult: any;
      try {
        caregiverResult = await callClaude(anthropic, caregiverPrompt);
      } catch (error) {
        console.error("[SpeechCoach] Caregiver analysis failed, retrying:", error);
        try {
          caregiverResult = await callClaude(anthropic, caregiverPrompt);
        } catch (retryError) {
          console.error("[SpeechCoach] Caregiver analysis retry failed:", retryError);
          await ctx.runMutation(internal.speechCoach_lifecycle.markReviewFailed, {
            sessionId: args.sessionId,
            errorMessage: "AI analysis failed after two attempts. Please retry.",
          });
          return;
        }
      }

      // Only for clinical sessions with a patientId: SLP analysis
      let slpResult: Partial<AnalysisResult> = {};
      if (session.patientId) {
        const slpPrompt = buildSlpAnalysisPrompt(session, analysisInput);
        try {
          slpResult = await callClaude(anthropic, slpPrompt) as Partial<AnalysisResult>;
        } catch (error) {
          // SLP analysis failure is non-critical — caregiver view still saves
          console.warn("[SpeechCoach] SLP analysis failed (non-critical):", error);
        }
      }

      // Compute cue distribution from rawAttempts (no Claude needed)
      let cueDistribution: { spontaneous: number; model: number; phoneticCue: number; directCorrection: number } | undefined;
      if (session.rawAttempts?.length) {
        const { computeCueDistribution } = await import("./speech_coach_analysis_compute");
        cueDistribution = computeCueDistribution(session.rawAttempts);
      }

      await ctx.runMutation(internal.speechCoach_lifecycle.saveProgress, {
        sessionId: args.sessionId,
        patientId: session.patientId,
        caregiverUserId: session.caregiverUserId,
        userId: session.userId,
        soundsAttempted: caregiverResult.soundsAttempted,
        overallEngagement: caregiverResult.overallEngagement,
        recommendedNextFocus: caregiverResult.recommendedNextFocus,
        summary: caregiverResult.summary,
        analyzedAt: Date.now(),
        transcriptTurns: slpResult.transcriptTurns,
        scoreCards: slpResult.scoreCards,
        insights: slpResult.insights
          ? { ...slpResult.insights, homePracticeNotes: caregiverResult.homePracticeNotes ?? slpResult.insights.homePracticeNotes ?? [] }
          : undefined,
        cueDistribution,
        positionAccuracy: slpResult.positionAccuracy,
        iepNoteDraft: slpResult.iepNoteDraft,
      });

      if (session.patientId && session.homeProgramId) {
        const sessionDuration = session.startedAt && session.endedAt
          ? Math.round((session.endedAt - session.startedAt) / 60000)
          : undefined;
        const soundsList = (caregiverResult.soundsAttempted as Array<{ sound: string }>).map((sound) => sound.sound).join(", ");

        try {
          await ctx.runMutation(internal.speechCoach_lifecycle.savePracticeLog, {
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

        try {
          await ctx.runMutation(internal.speechCoach_lifecycle.saveGoalProgress, {
            homeProgramId: session.homeProgramId,
            patientId: session.patientId,
            sourceId: args.sessionId as string,
            accuracy: computeAverageAccuracy(caregiverResult.soundsAttempted),
            date: new Date().toISOString().slice(0, 10),
          });
        } catch (error) {
          console.error("[SpeechCoach] Goal progress write failed:", error);
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error("[SpeechCoach] analyzeSession failed:", errorMessage);
      await ctx.runMutation(internal.speechCoach_lifecycle.markReviewFailed, {
        sessionId: args.sessionId,
        errorMessage,
      });
    }
  },
});

async function loadStoredTranscript(
  ctx: ActionCtx,
  session: Doc<"speechCoachSessions">,
): Promise<AnalysisInput> {
  if (!session.transcriptStorageId) {
    throw new Error("Transcript has not been captured yet");
  }

  const blob = await ctx.storage.get(session.transcriptStorageId);
  if (!blob) throw new Error("Stored transcript file is missing");

  return {
    transcript: await blob.text(),
    rawTranscriptTurns: session.rawTranscriptTurns,
  };
}

async function loadElevenLabsTranscript(
  ctx: ActionCtx,
  session: Doc<"speechCoachSessions">,
): Promise<AnalysisInput> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) throw new Error("Missing ELEVENLABS_API_KEY for legacy transcript fetch");
  if (!session.conversationId) throw new Error("Legacy ElevenLabs session is missing a conversationId");

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
  const transcript = JSON.stringify(data.transcript ?? data, null, 2);
  const transcriptBlob = new Blob([transcript], { type: "text/plain" });
  const storageId = await ctx.storage.store(transcriptBlob);

  await ctx.runMutation(internal.speechCoach_lifecycle.saveRuntimeTranscriptCapture, {
    sessionId: session._id,
    storageId,
    capturedAt: Date.now(),
    rawTranscriptTurns: undefined,
    queueForAnalysis: false,
  });

  return { transcript };
}

/** Caregiver-facing analysis — always runs. Parent-friendly language, no clinical terms. */
function buildCaregiverAnalysisPrompt(
  session: Doc<"speechCoachSessions">,
  analysisInput: AnalysisInput,
): string {
  const targetSounds = session.config.targetSounds.join(", ");
  const rawTurnsContext = analysisInput.rawTranscriptTurns?.length
    ? `\nRAW TURNS:\n${JSON.stringify(analysisInput.rawTranscriptTurns, null, 2)}\n`
    : "";

  return `You are analyzing a speech practice session between an AI coach and a child. Write for the child's parent — warm, encouraging, no clinical terminology.

The session practiced these sounds: ${targetSounds}
${session.config.focusArea ? `Focus area: ${session.config.focusArea}` : ""}
${rawTurnsContext}
TRANSCRIPT:
${analysisInput.transcript}

Respond with a JSON object matching this EXACT shape (no markdown fences):
{
  "summary": "2-3 encouraging sentences for the parent. Say what sounds were practiced and give a positive observation. Never use terms like 'phoneme', 'articulation', 'percent correct', or cue level names.",
  "soundsAttempted": [{"sound": "/s/", "wordsAttempted": 8, "approximateSuccessRate": "high", "notes": "Parent-friendly note, e.g. 'Getting this sound well at the start of words'"}],
  "overallEngagement": "high",
  "recommendedNextFocus": ["/s/"],
  "homePracticeNotes": ["A simple home tip the parent can actually do, e.g. 'Point to things that start with S on your next walk'"]
}

Rules:
- approximateSuccessRate must be "high", "medium", or "low"
- overallEngagement must be "high", "medium", or "low"
- homePracticeNotes: 1-3 concrete, specific activities parents can do at home
- summary: NEVER mention accuracy numbers, percentages, cue levels, or clinical metrics`;
}

/** SLP-facing analysis — only runs when session has a patientId. Clinical language, structured metrics. */
function buildSlpAnalysisPrompt(
  session: Doc<"speechCoachSessions">,
  analysisInput: AnalysisInput,
): string {
  const targetSounds = session.config.targetSounds.join(", ");
  const rawTurnsContext = analysisInput.rawTranscriptTurns?.length
    ? `\nRAW TURNS:\n${JSON.stringify(analysisInput.rawTranscriptTurns, null, 2)}\n`
    : "";

  return `You are analyzing a speech therapy session transcript. Write for a licensed speech-language pathologist. Use clinical terminology.

Session targeted sounds: ${targetSounds}
Age range: ${session.config.ageRange}
${session.config.focusArea ? `Focus area: ${session.config.focusArea}` : ""}
${rawTurnsContext}
TRANSCRIPT:
${analysisInput.transcript}

Respond with a JSON object matching this EXACT shape (no markdown fences):
{
  "scoreCards": {
    "overall": 72,
    "productionAccuracy": 68,
    "consistency": 70,
    "cueingSupport": 55,
    "engagement": 80
  },
  "insights": {
    "strengths": ["Observable strength statement"],
    "patterns": ["Error pattern observed, e.g. final consonant deletion on /s/"],
    "notableCueingPatterns": ["Cue level observation"],
    "recommendedNextTargets": ["/s/ medial position"],
    "homePracticeNotes": ["Clinical recommendation for home carryover"]
  },
  "positionAccuracy": [
    {"sound": "/s/", "position": "initial", "correct": 9, "total": 11},
    {"sound": "/s/", "position": "medial", "correct": 4, "total": 9}
  ],
  "errorPatterns": ["Pattern 1", "Pattern 2"],
  "iepNoteDraft": "Student produced /s/ in initial position with X% accuracy across N trials. [Continue with clinical observations. Max 3 sentences.]"
}

Rules:
- scoreCards: all values 0-100 integers
- positionAccuracy: include each sound/position combination attempted; position must be "initial", "medial", "final", or "unknown"
- iepNoteDraft: clinical, concise, IEP-ready. Do NOT include phrases like 'the AI noted' or 'according to the session'. Write as if you observed it.`;
}

async function callClaude(
  anthropic: Anthropic,
  prompt: string
): Promise<AnalysisResult> {
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 4096,
    messages: [{ role: "user", content: prompt }],
  }, { timeout: 45_000 });

  const textBlock = response.content.find((block) => block.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("No text response from Claude");
  }

  let jsonStr = textBlock.text;
  const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) jsonStr = jsonMatch[1];
  return JSON.parse(jsonStr.trim()) as AnalysisResult;
}

function computeAverageAccuracy(
  sounds: Array<{ approximateSuccessRate: "high" | "medium" | "low" }>
): number {
  if (sounds.length === 0) return 0;
  const rateMap = { high: 85, medium: 60, low: 30 };
  const total = sounds.reduce((sum, sound) => sum + rateMap[sound.approximateSuccessRate], 0);
  return Math.round(total / sounds.length);
}

// ── Timeout guard ────────────────────────────────────────────────────────────

export const checkSessionTimeout = internalAction({
  args: { sessionId: v.id("speechCoachSessions") },
  handler: async (ctx, args) => {
    const session = await ctx.runQuery(internal.speechCoach_lifecycle.getSessionById, {
      sessionId: args.sessionId,
    });
    // Only mark failed if still stuck in analyzing after 90s
    if (session?.status === "analyzing") {
      await ctx.runMutation(internal.speechCoach_lifecycle.markReviewFailed, {
        sessionId: args.sessionId,
        errorMessage: "Review timed out after 90 seconds. You can retry below.",
      });
    }
  },
});
