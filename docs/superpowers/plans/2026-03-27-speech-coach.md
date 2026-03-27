# Speech Coach Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a real-time speech coaching feature using ElevenLabs Conversational AI with post-session analysis via Claude and a parent-facing progress dashboard.

**Architecture:** ElevenLabs agent handles live voice sessions (WebSocket via `@elevenlabs/react`). Convex manages session lifecycle and stores progress data. Claude analyzes transcripts post-session. Signed URL auth flow keeps API keys server-side.

**Tech Stack:** ElevenLabs Conversational AI (`@elevenlabs/react`), Convex (schema + functions), Anthropic SDK (post-session analysis), Next.js App Router, shadcn/ui, Tailwind v4

**Spec:** `docs/superpowers/specs/2026-03-27-speech-coach-design.md`

---

## File Map

### New Files

| File | Responsibility |
|------|---------------|
| `convex/speechCoach.ts` | Queries + mutations (session CRUD, history, progress). No `"use node"`. |
| `convex/speechCoachActions.ts` | Actions with `"use node"`: signed URL generation, transcript fetch, Claude analysis |
| `convex/__tests__/speechCoach.test.ts` | Backend tests for queries + mutations |
| `src/features/speech-coach/components/session-config.tsx` | Session setup form (target sounds, age range, duration) |
| `src/features/speech-coach/components/active-session.tsx` | Live coaching screen with ElevenLabs ConversationProvider |
| `src/features/speech-coach/components/session-history.tsx` | Past sessions list |
| `src/features/speech-coach/components/progress-card.tsx` | Single session analysis display |
| `src/features/speech-coach/components/progress-dashboard.tsx` | Aggregate progress view |
| `src/features/speech-coach/components/speech-coach-page.tsx` | Top-level page with tab navigation |
| `src/features/speech-coach/hooks/use-speech-session.ts` | Session lifecycle hook (create → start → end → analyze) |
| `src/features/speech-coach/lib/curriculum-data.ts` | Exercise content for knowledge base |
| `src/features/speech-coach/components/__tests__/session-config.test.tsx` | Frontend unit tests |
| `src/features/speech-coach/components/__tests__/progress-card.test.tsx` | Frontend unit tests |
| `src/features/speech-coach/components/__tests__/progress-dashboard.test.tsx` | Frontend unit tests |
| `src/features/speech-coach/hooks/__tests__/use-speech-session.test.ts` | Hook tests |
| `src/app/(app)/speech-coach/page.tsx` | Thin route wrapper |
| `scripts/seed-speech-curriculum.ts` | One-time script to upload curriculum to ElevenLabs |

### Modified Files

| File | Change |
|------|--------|
| `convex/schema.ts` | Add `speechCoachSessions` + `speechCoachProgress` tables |
| `src/core/routes.ts` | Add `SPEECH_COACH: "/speech-coach"` |
| `src/shared/lib/navigation.ts` | Add Speech Coach nav item + `isNavActive` case |
| `package.json` | Add `@elevenlabs/react` dependency |

---

## Task 1: Schema — Add Speech Coach Tables

**Files:**
- Modify: `convex/schema.ts:130` (end of file, before closing `});`)
- Test: `convex/__tests__/speechCoach.test.ts` (create)

- [ ] **Step 1: Write failing test — schema validates speech coach documents**

Create `convex/__tests__/speechCoach.test.ts`:

```typescript
// convex/__tests__/speechCoach.test.ts
import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";

import schema from "../schema";

const modules = import.meta.glob("../**/*.*s");

const TEST_IDENTITY = { subject: "test-user-123", issuer: "clerk" };

describe("speechCoachSessions schema", () => {
  it("accepts a valid session document", async () => {
    const t = convexTest(schema, modules).withIdentity(TEST_IDENTITY);
    const id = await t.run(async (ctx) => {
      return await ctx.db.insert("speechCoachSessions", {
        userId: "test-user-123",
        agentId: "agent_abc123",
        status: "configuring",
        config: {
          targetSounds: ["/s/", "/r/"],
          ageRange: "2-4",
          durationMinutes: 5,
        },
      });
    });
    const session = await t.run(async (ctx) => ctx.db.get(id));
    expect(session).not.toBeNull();
    expect(session?.status).toBe("configuring");
    expect(session?.config.targetSounds).toEqual(["/s/", "/r/"]);
  });

  it("accepts all valid status values", async () => {
    const t = convexTest(schema, modules).withIdentity(TEST_IDENTITY);
    for (const status of ["configuring", "active", "completed", "analyzed", "failed"] as const) {
      const id = await t.run(async (ctx) => {
        return await ctx.db.insert("speechCoachSessions", {
          userId: "test-user-123",
          agentId: "agent_abc123",
          status,
          config: {
            targetSounds: ["/s/"],
            ageRange: "5-7",
            durationMinutes: 10,
          },
        });
      });
      const doc = await t.run(async (ctx) => ctx.db.get(id));
      expect(doc?.status).toBe(status);
    }
  });
});

describe("speechCoachProgress schema", () => {
  it("accepts a valid progress document", async () => {
    const t = convexTest(schema, modules).withIdentity(TEST_IDENTITY);
    const sessionId = await t.run(async (ctx) => {
      return await ctx.db.insert("speechCoachSessions", {
        userId: "test-user-123",
        agentId: "agent_abc123",
        status: "analyzed",
        config: {
          targetSounds: ["/s/"],
          ageRange: "2-4",
          durationMinutes: 5,
        },
      });
    });
    const progressId = await t.run(async (ctx) => {
      return await ctx.db.insert("speechCoachProgress", {
        sessionId,
        userId: "test-user-123",
        soundsAttempted: [
          {
            sound: "/s/",
            wordsAttempted: 8,
            approximateSuccessRate: "high",
            notes: "Strong initial /s/, struggled with blends",
          },
        ],
        overallEngagement: "high",
        recommendedNextFocus: ["/r/"],
        summary: "Great session! Practiced /s/ sounds with strong results.",
        analyzedAt: Date.now(),
      });
    });
    const progress = await t.run(async (ctx) => ctx.db.get(progressId));
    expect(progress).not.toBeNull();
    expect(progress?.soundsAttempted).toHaveLength(1);
    expect(progress?.overallEngagement).toBe("high");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run convex/__tests__/speechCoach.test.ts`
Expected: FAIL — tables `speechCoachSessions` and `speechCoachProgress` don't exist in schema

- [ ] **Step 3: Add tables to schema**

Add to `convex/schema.ts` before the closing `});`:

```typescript
  speechCoachSessions: defineTable({
    userId: v.string(),
    agentId: v.string(),
    conversationId: v.optional(v.string()),
    status: v.union(
      v.literal("configuring"),
      v.literal("active"),
      v.literal("completed"),
      v.literal("analyzed"),
      v.literal("failed")
    ),
    config: v.object({
      targetSounds: v.array(v.string()),
      ageRange: v.union(v.literal("2-4"), v.literal("5-7")),
      durationMinutes: v.number(),
      focusArea: v.optional(v.string()),
    }),
    startedAt: v.optional(v.number()),
    endedAt: v.optional(v.number()),
    transcriptStorageId: v.optional(v.id("_storage")),
    errorMessage: v.optional(v.string()),
  })
    .index("by_userId_startedAt", ["userId", "startedAt"]),

  speechCoachProgress: defineTable({
    sessionId: v.id("speechCoachSessions"),
    userId: v.string(),
    soundsAttempted: v.array(
      v.object({
        sound: v.string(),
        wordsAttempted: v.number(),
        approximateSuccessRate: v.union(
          v.literal("high"),
          v.literal("medium"),
          v.literal("low")
        ),
        notes: v.string(),
      })
    ),
    overallEngagement: v.union(
      v.literal("high"),
      v.literal("medium"),
      v.literal("low")
    ),
    recommendedNextFocus: v.array(v.string()),
    summary: v.string(),
    analyzedAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_sessionId", ["sessionId"]),
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run convex/__tests__/speechCoach.test.ts`
Expected: PASS — all 3 tests green

- [ ] **Step 5: Commit**

```bash
git add convex/schema.ts convex/__tests__/speechCoach.test.ts
git commit -m "feat(speech-coach): add speechCoachSessions + speechCoachProgress schema tables"
```

---

## Task 2: Convex Queries & Mutations — `convex/speechCoach.ts`

**Files:**
- Create: `convex/speechCoach.ts`
- Test: `convex/__tests__/speechCoach.test.ts` (extend)

- [ ] **Step 1: Write failing tests for mutations**

Append to `convex/__tests__/speechCoach.test.ts`:

```typescript
import { api, internal } from "../_generated/api";

describe("speechCoach mutations", () => {
  it("createSession creates a configuring session for authenticated user", async () => {
    const t = convexTest(schema, modules).withIdentity(TEST_IDENTITY);
    const id = await t.mutation(api.speechCoach.createSession, {
      agentId: "agent_abc123",
      config: {
        targetSounds: ["/s/", "/r/"],
        ageRange: "2-4",
        durationMinutes: 5,
      },
    });
    const session = await t.run(async (ctx) => ctx.db.get(id));
    expect(session?.status).toBe("configuring");
    expect(session?.userId).toBe("test-user-123");
  });

  it("createSession throws for unauthenticated user", async () => {
    const t = convexTest(schema, modules);
    await expect(
      t.mutation(api.speechCoach.createSession, {
        agentId: "agent_abc123",
        config: {
          targetSounds: ["/s/"],
          ageRange: "5-7",
          durationMinutes: 10,
        },
      })
    ).rejects.toThrow("Not authenticated");
  });

  it("startSession sets conversationId and status to active", async () => {
    const t = convexTest(schema, modules).withIdentity(TEST_IDENTITY);
    const id = await t.mutation(api.speechCoach.createSession, {
      agentId: "agent_abc123",
      config: {
        targetSounds: ["/s/"],
        ageRange: "2-4",
        durationMinutes: 5,
      },
    });
    await t.mutation(api.speechCoach.startSession, {
      sessionId: id,
      conversationId: "conv_xyz789",
    });
    const session = await t.run(async (ctx) => ctx.db.get(id));
    expect(session?.status).toBe("active");
    expect(session?.conversationId).toBe("conv_xyz789");
    expect(session?.startedAt).toBeDefined();
  });

  it("endSession sets status to completed and stores endedAt", async () => {
    const t = convexTest(schema, modules).withIdentity(TEST_IDENTITY);
    const id = await t.mutation(api.speechCoach.createSession, {
      agentId: "agent_abc123",
      config: {
        targetSounds: ["/s/"],
        ageRange: "2-4",
        durationMinutes: 5,
      },
    });
    await t.mutation(api.speechCoach.startSession, {
      sessionId: id,
      conversationId: "conv_xyz789",
    });
    await t.mutation(api.speechCoach.endSession, { sessionId: id });
    const session = await t.run(async (ctx) => ctx.db.get(id));
    expect(session?.status).toBe("completed");
    expect(session?.endedAt).toBeDefined();
  });

  it("failSession sets status to failed with error message", async () => {
    const t = convexTest(schema, modules).withIdentity(TEST_IDENTITY);
    const id = await t.mutation(api.speechCoach.createSession, {
      agentId: "agent_abc123",
      config: {
        targetSounds: ["/s/"],
        ageRange: "2-4",
        durationMinutes: 5,
      },
    });
    await t.mutation(api.speechCoach.failSession, {
      sessionId: id,
      errorMessage: "Microphone access denied",
    });
    const session = await t.run(async (ctx) => ctx.db.get(id));
    expect(session?.status).toBe("failed");
    expect(session?.errorMessage).toBe("Microphone access denied");
  });
});

describe("speechCoach queries", () => {
  it("getSessionHistory returns sessions sorted by startedAt descending", async () => {
    const t = convexTest(schema, modules).withIdentity(TEST_IDENTITY);
    // Create two sessions with different startedAt
    const id1 = await t.run(async (ctx) => {
      return await ctx.db.insert("speechCoachSessions", {
        userId: "test-user-123",
        agentId: "agent_abc123",
        status: "analyzed",
        config: { targetSounds: ["/s/"], ageRange: "2-4", durationMinutes: 5 },
        startedAt: 1000,
        endedAt: 1300,
      });
    });
    const id2 = await t.run(async (ctx) => {
      return await ctx.db.insert("speechCoachSessions", {
        userId: "test-user-123",
        agentId: "agent_abc123",
        status: "analyzed",
        config: { targetSounds: ["/r/"], ageRange: "5-7", durationMinutes: 10 },
        startedAt: 2000,
        endedAt: 2600,
      });
    });
    const history = await t.query(api.speechCoach.getSessionHistory, {});
    expect(history).toHaveLength(2);
    // Most recent first
    expect(history[0]._id).toBe(id2);
    expect(history[1]._id).toBe(id1);
  });

  it("getSessionHistory returns empty for unauthenticated user", async () => {
    const t = convexTest(schema, modules);
    const history = await t.query(api.speechCoach.getSessionHistory, {});
    expect(history).toEqual([]);
  });

  it("getProgress returns progress records for user", async () => {
    const t = convexTest(schema, modules).withIdentity(TEST_IDENTITY);
    const sessionId = await t.run(async (ctx) => {
      return await ctx.db.insert("speechCoachSessions", {
        userId: "test-user-123",
        agentId: "agent_abc123",
        status: "analyzed",
        config: { targetSounds: ["/s/"], ageRange: "2-4", durationMinutes: 5 },
      });
    });
    await t.run(async (ctx) => {
      await ctx.db.insert("speechCoachProgress", {
        sessionId,
        userId: "test-user-123",
        soundsAttempted: [
          { sound: "/s/", wordsAttempted: 8, approximateSuccessRate: "high", notes: "Good" },
        ],
        overallEngagement: "high",
        recommendedNextFocus: ["/r/"],
        summary: "Great session!",
        analyzedAt: Date.now(),
      });
    });
    const progress = await t.query(api.speechCoach.getProgress, {});
    expect(progress).toHaveLength(1);
    expect(progress[0].summary).toBe("Great session!");
  });

  it("getSessionDetail returns session with its progress", async () => {
    const t = convexTest(schema, modules).withIdentity(TEST_IDENTITY);
    const sessionId = await t.run(async (ctx) => {
      return await ctx.db.insert("speechCoachSessions", {
        userId: "test-user-123",
        agentId: "agent_abc123",
        status: "analyzed",
        config: { targetSounds: ["/s/"], ageRange: "2-4", durationMinutes: 5 },
      });
    });
    await t.run(async (ctx) => {
      await ctx.db.insert("speechCoachProgress", {
        sessionId,
        userId: "test-user-123",
        soundsAttempted: [
          { sound: "/s/", wordsAttempted: 5, approximateSuccessRate: "medium", notes: "OK" },
        ],
        overallEngagement: "medium",
        recommendedNextFocus: ["/s/"],
        summary: "Decent session.",
        analyzedAt: Date.now(),
      });
    });
    const detail = await t.query(api.speechCoach.getSessionDetail, { sessionId });
    expect(detail?.session).not.toBeNull();
    expect(detail?.progress).not.toBeNull();
    expect(detail?.progress?.summary).toBe("Decent session.");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run convex/__tests__/speechCoach.test.ts`
Expected: FAIL — `api.speechCoach` does not exist

- [ ] **Step 3: Implement `convex/speechCoach.ts`**

Create `convex/speechCoach.ts`:

```typescript
import { v } from "convex/values";

import { internal } from "./_generated/api";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "./lib/auth";

// ─── Mutations ──────────────────────────────────────────────────────────────

export const createSession = mutation({
  args: {
    agentId: v.string(),
    config: v.object({
      targetSounds: v.array(v.string()),
      ageRange: v.union(v.literal("2-4"), v.literal("5-7")),
      durationMinutes: v.number(),
      focusArea: v.optional(v.string()),
    }),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    return await ctx.db.insert("speechCoachSessions", {
      userId,
      agentId: args.agentId,
      status: "configuring",
      config: args.config,
    });
  },
});

export const startSession = mutation({
  args: {
    sessionId: v.id("speechCoachSessions"),
    conversationId: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const session = await ctx.db.get(args.sessionId);
    if (!session || session.userId !== userId) throw new Error("Not authorized");
    await ctx.db.patch(args.sessionId, {
      conversationId: args.conversationId,
      status: "active",
      startedAt: Date.now(),
    });
  },
});

export const endSession = mutation({
  args: {
    sessionId: v.id("speechCoachSessions"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const session = await ctx.db.get(args.sessionId);
    if (!session || session.userId !== userId) throw new Error("Not authorized");
    await ctx.db.patch(args.sessionId, {
      status: "completed",
      endedAt: Date.now(),
    });
    // Schedule post-session analysis if conversation happened
    if (session.conversationId) {
      await ctx.scheduler.runAfter(0, internal.speechCoachActions.analyzeSession, {
        sessionId: args.sessionId,
      });
    }
  },
});

export const failSession = mutation({
  args: {
    sessionId: v.id("speechCoachSessions"),
    errorMessage: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const session = await ctx.db.get(args.sessionId);
    if (!session || session.userId !== userId) throw new Error("Not authorized");
    await ctx.db.patch(args.sessionId, {
      status: "failed",
      errorMessage: args.errorMessage,
      endedAt: Date.now(),
    });
  },
});

// ─── Queries ────────────────────────────────────────────────────────────────

export const getSessionHistory = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const sessions = await ctx.db
      .query("speechCoachSessions")
      .withIndex("by_userId_startedAt", (q) => q.eq("userId", userId))
      .collect();
    // Reverse for most-recent-first (index is ascending)
    return sessions.reverse();
  },
});

export const getProgress = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    return await ctx.db
      .query("speechCoachProgress")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();
  },
});

export const getSessionDetail = query({
  args: { sessionId: v.id("speechCoachSessions") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const session = await ctx.db.get(args.sessionId);
    if (!session || session.userId !== userId) return null;
    const progress = await ctx.db
      .query("speechCoachProgress")
      .withIndex("by_sessionId", (q) => q.eq("sessionId", args.sessionId))
      .first();
    return { session, progress };
  },
});
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run convex/__tests__/speechCoach.test.ts`
Expected: PASS — all tests green

Note: The `endSession` test may log a warning about `internal.speechCoachActions.analyzeSession` not existing yet — that's expected. The scheduler call is a fire-and-forget. If convex-test throws on missing internal references, temporarily comment out the scheduler line, verify tests pass, then uncomment.

- [ ] **Step 5: Commit**

```bash
git add convex/speechCoach.ts convex/__tests__/speechCoach.test.ts
git commit -m "feat(speech-coach): add Convex queries and mutations for session lifecycle"
```

---

## Task 3: Convex Actions — `convex/speechCoachActions.ts`

**Files:**
- Create: `convex/speechCoachActions.ts`

This file uses `"use node"` and calls external APIs. It cannot be tested with convex-test (actions with external calls are not supported). Manual testing will happen during integration.

- [ ] **Step 1: Create `convex/speechCoachActions.ts`**

```typescript
"use node";

import Anthropic from "@anthropic-ai/sdk";
import { v } from "convex/values";

import { internalAction, action } from "./_generated/server";
import { internal } from "./_generated/api";

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
        return; // Session stays "completed" — parent sees "too short to analyze"
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
2. For each sound: approximate success rate (high/medium/low) based on whether the child's responses match target words. Look for substitutions, omissions, or distortions you can infer from the text.
3. Overall engagement level (high/medium/low) — did the child participate actively?
4. What sounds should be focused on next session
5. A 2-3 sentence parent-friendly summary. Be encouraging — this will be read by parents.

TRANSCRIPT:
${transcript}

Respond with a JSON object matching this exact shape:
{
  "soundsAttempted": [{ "sound": "/s/", "wordsAttempted": 8, "approximateSuccessRate": "high", "notes": "..." }],
  "overallEngagement": "high",
  "recommendedNextFocus": ["/r/"],
  "summary": "..."
}`;

    try {
      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 1024,
        messages: [{ role: "user", content: analysisPrompt }],
      });

      const textBlock = response.content.find((b) => b.type === "text");
      if (!textBlock || textBlock.type !== "text") {
        throw new Error("No text response from Claude");
      }

      // Extract JSON from response (handle markdown code blocks)
      let jsonStr = textBlock.text;
      const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) jsonStr = jsonMatch[1];
      jsonStr = jsonStr.trim();

      const analysis = JSON.parse(jsonStr) as {
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

      // 5. Write progress to Convex
      await ctx.runMutation(internal.speechCoach.saveProgress, {
        sessionId: args.sessionId,
        userId: session.userId,
        soundsAttempted: analysis.soundsAttempted,
        overallEngagement: analysis.overallEngagement,
        recommendedNextFocus: analysis.recommendedNextFocus,
        summary: analysis.summary,
      });
    } catch (error) {
      console.error("[SpeechCoach] Claude analysis failed:", error);
      // Retry once
      try {
        const retryResponse = await anthropic.messages.create({
          model: "claude-sonnet-4-6",
          max_tokens: 1024,
          messages: [{ role: "user", content: analysisPrompt }],
        });
        const retryText = retryResponse.content.find((b) => b.type === "text");
        if (retryText && retryText.type === "text") {
          let jsonStr = retryText.text;
          const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
          if (jsonMatch) jsonStr = jsonMatch[1];
          const analysis = JSON.parse(jsonStr.trim());
          await ctx.runMutation(internal.speechCoach.saveProgress, {
            sessionId: args.sessionId,
            userId: session.userId,
            ...analysis,
          });
        }
      } catch (retryError) {
        console.error("[SpeechCoach] Retry also failed:", retryError);
        // Transcript is stored — parent can at least see the session happened
      }
    }
  },
});
```

- [ ] **Step 2: Add internal helpers to `convex/speechCoach.ts`**

Add these internal functions at the bottom of `convex/speechCoach.ts`:

```typescript
import { internalMutation, internalQuery } from "./_generated/server";

// ─── Internal (called by actions, not client) ───────────────────────────────

export const getSessionById = internalQuery({
  args: { sessionId: v.id("speechCoachSessions") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.sessionId);
  },
});

export const setTranscriptStorageId = internalMutation({
  args: {
    sessionId: v.id("speechCoachSessions"),
    storageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.sessionId, {
      transcriptStorageId: args.storageId,
    });
  },
});

export const saveProgress = internalMutation({
  args: {
    sessionId: v.id("speechCoachSessions"),
    userId: v.string(),
    soundsAttempted: v.array(
      v.object({
        sound: v.string(),
        wordsAttempted: v.number(),
        approximateSuccessRate: v.union(
          v.literal("high"),
          v.literal("medium"),
          v.literal("low")
        ),
        notes: v.string(),
      })
    ),
    overallEngagement: v.union(
      v.literal("high"),
      v.literal("medium"),
      v.literal("low")
    ),
    recommendedNextFocus: v.array(v.string()),
    summary: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("speechCoachProgress", {
      sessionId: args.sessionId,
      userId: args.userId,
      soundsAttempted: args.soundsAttempted,
      overallEngagement: args.overallEngagement,
      recommendedNextFocus: args.recommendedNextFocus,
      summary: args.summary,
      analyzedAt: Date.now(),
    });
    await ctx.db.patch(args.sessionId, { status: "analyzed" });
  },
});
```

Also update the imports at the top of `convex/speechCoach.ts`:

```typescript
import { internal } from "./_generated/api";
import { mutation, query, internalMutation, internalQuery } from "./_generated/server";
```

(The `internal` import was already added in Step 3 — just ensure `internalMutation` and `internalQuery` are added to the server import.)

- [ ] **Step 3: Verify full test suite still passes**

Run: `npx vitest run convex/__tests__/speechCoach.test.ts`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add convex/speechCoachActions.ts convex/speechCoach.ts
git commit -m "feat(speech-coach): add Convex actions — signed URL + post-session analysis pipeline"
```

---

## Task 4: Navigation & Route Setup

**Files:**
- Modify: `src/core/routes.ts`
- Modify: `src/shared/lib/navigation.ts`
- Create: `src/app/(app)/speech-coach/page.tsx`
- Create: `src/features/speech-coach/components/speech-coach-page.tsx`

- [ ] **Step 1: Add route constant**

In `src/core/routes.ts`, add after the `FLASHCARDS` line:

```typescript
  SPEECH_COACH: "/speech-coach",
```

- [ ] **Step 2: Add navigation item**

In `src/shared/lib/navigation.ts`, add after the Templates entry (line 7):

```typescript
  { icon: "record_voice_over", label: "Speech Coach", href: ROUTES.SPEECH_COACH },
```

Add `isNavActive` case — add before the `return pathname === href;` line:

```typescript
  if (href === "/speech-coach") {
    return pathname.startsWith("/speech-coach");
  }
```

- [ ] **Step 3: Create page wrapper**

Create `src/app/(app)/speech-coach/page.tsx`:

```tsx
"use client";

import { ErrorBoundary } from "react-error-boundary";

import { SpeechCoachPage } from "@/features/speech-coach/components/speech-coach-page";
import { Button } from "@/shared/components/ui/button";

function SpeechCoachErrorFallback({ resetErrorBoundary }: { resetErrorBoundary: () => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 bg-surface text-on-surface">
      <p className="text-lg font-semibold">Something went wrong</p>
      <Button variant="outline" onClick={resetErrorBoundary}>
        Try again
      </Button>
    </div>
  );
}

export default function Page() {
  return (
    <ErrorBoundary FallbackComponent={SpeechCoachErrorFallback}>
      <SpeechCoachPage />
    </ErrorBoundary>
  );
}
```

- [ ] **Step 4: Create placeholder page component**

Create `src/features/speech-coach/components/speech-coach-page.tsx`:

```tsx
"use client";

import { useUser } from "@clerk/nextjs";

export function SpeechCoachPage() {
  const { isSignedIn, isLoaded } = useUser();

  if (!isLoaded) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
        <h2 className="font-manrope text-2xl font-bold text-foreground">Speech Coach</h2>
        <p className="text-muted-foreground">Sign in to start a speech coaching session.</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col p-6">
      <h1 className="font-manrope text-2xl font-bold text-foreground">Speech Coach</h1>
      <p className="mt-2 text-muted-foreground">Coming soon — speech coaching sessions for your child.</p>
    </div>
  );
}
```

- [ ] **Step 5: Verify it renders**

Run: `npm run dev` — navigate to `/speech-coach`. Verify:
- Page loads with "Speech Coach" heading
- Sidebar shows "Speech Coach" with microphone icon
- Nav item highlights when active

- [ ] **Step 6: Commit**

```bash
git add src/core/routes.ts src/shared/lib/navigation.ts src/app/\(app\)/speech-coach/page.tsx src/features/speech-coach/components/speech-coach-page.tsx
git commit -m "feat(speech-coach): add route, sidebar nav, and page shell"
```

---

## Task 5: Install `@elevenlabs/react` + Session Config Component

**Files:**
- Modify: `package.json` (via npm install)
- Create: `src/features/speech-coach/components/session-config.tsx`
- Test: `src/features/speech-coach/components/__tests__/session-config.test.tsx`

- [ ] **Step 1: Install dependency**

```bash
npm install @elevenlabs/react
```

- [ ] **Step 2: Write failing test for SessionConfig**

Create `src/features/speech-coach/components/__tests__/session-config.test.tsx`:

```tsx
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { SessionConfig } from "../session-config";

describe("SessionConfig", () => {
  it("renders target sound checkboxes", () => {
    render(<SessionConfig onStart={vi.fn()} />);
    expect(screen.getByLabelText("/s/ & /z/")).toBeInTheDocument();
    expect(screen.getByLabelText("/r/")).toBeInTheDocument();
    expect(screen.getByLabelText("/l/")).toBeInTheDocument();
  });

  it("renders age range toggle", () => {
    render(<SessionConfig onStart={vi.fn()} />);
    expect(screen.getByText("Ages 2-4")).toBeInTheDocument();
    expect(screen.getByText("Ages 5-7")).toBeInTheDocument();
  });

  it("calls onStart with config when Start Session is clicked", () => {
    const onStart = vi.fn();
    render(<SessionConfig onStart={onStart} />);
    // Check a sound
    fireEvent.click(screen.getByLabelText("/s/ & /z/"));
    // Click start
    fireEvent.click(screen.getByText("Start Session"));
    expect(onStart).toHaveBeenCalledWith(
      expect.objectContaining({
        targetSounds: expect.arrayContaining(["/s/"]),
        ageRange: expect.any(String),
        durationMinutes: expect.any(Number),
      })
    );
  });

  it("disables Start button when no sounds selected", () => {
    render(<SessionConfig onStart={vi.fn()} />);
    expect(screen.getByText("Start Session")).toBeDisabled();
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run src/features/speech-coach/components/__tests__/session-config.test.tsx`
Expected: FAIL — module not found

- [ ] **Step 4: Implement SessionConfig**

Create `src/features/speech-coach/components/session-config.tsx`:

```tsx
"use client";

import { useState } from "react";

import { Button } from "@/shared/components/ui/button";
import { cn } from "@/core/utils";

const TARGET_SOUNDS = [
  { id: "/s/", label: "/s/ & /z/" },
  { id: "/r/", label: "/r/" },
  { id: "/l/", label: "/l/" },
  { id: "/th/", label: "/th/" },
  { id: "/ch/", label: "/ch/ & /sh/" },
  { id: "/f/", label: "/f/ & /v/" },
  { id: "/k/", label: "/k/ & /g/" },
  { id: "blends", label: "Blends" },
] as const;

type SessionConfigData = {
  targetSounds: string[];
  ageRange: "2-4" | "5-7";
  durationMinutes: number;
  focusArea?: string;
};

type Props = {
  onStart: (config: SessionConfigData) => void;
  lastRecommended?: string[];
  isLoading?: boolean;
};

export function SessionConfig({ onStart, lastRecommended, isLoading }: Props) {
  const [selectedSounds, setSelectedSounds] = useState<string[]>(lastRecommended ?? []);
  const [ageRange, setAgeRange] = useState<"2-4" | "5-7">("2-4");
  const [duration, setDuration] = useState<5 | 10>(5);
  const [focusArea, setFocusArea] = useState("");

  const toggleSound = (id: string) => {
    setSelectedSounds((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const handleStart = () => {
    onStart({
      targetSounds: selectedSounds,
      ageRange,
      durationMinutes: duration,
      focusArea: focusArea.trim() || undefined,
    });
  };

  return (
    <div className="flex flex-col gap-8">
      {/* Target sounds */}
      <div>
        <h3 className="font-manrope text-lg font-semibold text-foreground">
          What sounds should we practice?
        </h3>
        <div className="mt-3 flex flex-wrap gap-2">
          {TARGET_SOUNDS.map((sound) => (
            <label
              key={sound.id}
              className={cn(
                "flex cursor-pointer items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors duration-300",
                selectedSounds.includes(sound.id)
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              <input
                type="checkbox"
                className="sr-only"
                checked={selectedSounds.includes(sound.id)}
                onChange={() => toggleSound(sound.id)}
                aria-label={sound.label}
              />
              {sound.label}
            </label>
          ))}
        </div>
        {lastRecommended && lastRecommended.length > 0 && (
          <p className="mt-2 text-sm text-muted-foreground">
            Based on the last session, we recommend practicing these sounds.
          </p>
        )}
      </div>

      {/* Age range */}
      <div>
        <h3 className="font-manrope text-lg font-semibold text-foreground">
          How old is your child?
        </h3>
        <div className="mt-3 flex gap-3">
          {(["2-4", "5-7"] as const).map((range) => (
            <button
              key={range}
              type="button"
              onClick={() => setAgeRange(range)}
              className={cn(
                "rounded-lg px-6 py-3 text-sm font-medium transition-colors duration-300",
                ageRange === range
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              Ages {range}
            </button>
          ))}
        </div>
      </div>

      {/* Duration */}
      <div>
        <h3 className="font-manrope text-lg font-semibold text-foreground">
          How long?
        </h3>
        <div className="mt-3 flex gap-3">
          {([5, 10] as const).map((mins) => (
            <button
              key={mins}
              type="button"
              onClick={() => setDuration(mins)}
              className={cn(
                "rounded-lg px-6 py-3 text-sm font-medium transition-colors duration-300",
                duration === mins
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              {mins} minutes
            </button>
          ))}
        </div>
      </div>

      {/* Focus area */}
      <div>
        <h3 className="font-manrope text-lg font-semibold text-foreground">
          Anything specific to practice?
        </h3>
        <input
          type="text"
          placeholder="e.g. animal names, colors, friend's names"
          value={focusArea}
          onChange={(e) => setFocusArea(e.target.value)}
          className="mt-3 w-full rounded-lg border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
      </div>

      {/* Tip */}
      <div className="rounded-lg bg-muted/50 p-4">
        <p className="text-sm text-muted-foreground">
          Sit with your child in a quiet space. The coach will guide the session with fun word games and lots of encouragement!
        </p>
      </div>

      {/* Start */}
      <Button
        onClick={handleStart}
        disabled={selectedSounds.length === 0 || isLoading}
        className="w-full bg-gradient-to-br from-[#00595c] to-[#0d7377] py-6 text-lg font-semibold"
      >
        {isLoading ? "Connecting..." : "Start Session"}
      </Button>
    </div>
  );
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/features/speech-coach/components/__tests__/session-config.test.tsx`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json src/features/speech-coach/components/session-config.tsx src/features/speech-coach/components/__tests__/session-config.test.tsx
git commit -m "feat(speech-coach): install @elevenlabs/react + session config component"
```

---

## Task 6: Active Session Component + `useSpeechSession` Hook

**Files:**
- Create: `src/features/speech-coach/hooks/use-speech-session.ts`
- Create: `src/features/speech-coach/components/active-session.tsx`

- [ ] **Step 1: Implement `useSpeechSession` hook**

Create `src/features/speech-coach/hooks/use-speech-session.ts`:

```typescript
"use client";

import { useMutation, useAction } from "convex/react";
import { useState, useCallback } from "react";

import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

type SessionConfig = {
  targetSounds: string[];
  ageRange: "2-4" | "5-7";
  durationMinutes: number;
  focusArea?: string;
};

type SessionPhase = "idle" | "connecting" | "active" | "ending" | "done" | "error";

export function useSpeechSession() {
  const [phase, setPhase] = useState<SessionPhase>("idle");
  const [sessionId, setSessionId] = useState<Id<"speechCoachSessions"> | null>(null);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [durationMinutes, setDurationMinutes] = useState<number>(5);

  const createSession = useMutation(api.speechCoach.createSession);
  const startSession = useMutation(api.speechCoach.startSession);
  const endSessionMutation = useMutation(api.speechCoach.endSession);
  const failSessionMutation = useMutation(api.speechCoach.failSession);
  const getSignedUrl = useAction(api.speechCoachActions.getSignedUrl);

  const begin = useCallback(async (config: SessionConfig) => {
    let id: Id<"speechCoachSessions"> | undefined;
    try {
      setPhase("connecting");
      setError(null);

      // Check mic permission first
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((t) => t.stop()); // Release immediately
      } catch {
        setError("We need your microphone so the coach can hear your child. Please allow microphone access and try again.");
        setPhase("error");
        return;
      }

      // Create session
      const agentId = "speech-coach"; // Placeholder — actual ID from env
      id = await createSession({ agentId, config });
      setSessionId(id);
      setDurationMinutes(config.durationMinutes);

      // Get signed URL
      const { signedUrl: url } = await getSignedUrl({});
      setSignedUrl(url);
      setPhase("active");

      return { sessionId: id, signedUrl: url };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to start session";
      setError(msg);
      setPhase("error");
      // Use local `id` — React state `sessionId` may not be updated yet due to batching
      if (id) {
        await failSessionMutation({ sessionId: id, errorMessage: msg }).catch(() => {});
      }
    }
  }, [createSession, getSignedUrl, failSessionMutation, sessionId]);

  const markActive = useCallback(async (conversationId: string) => {
    if (!sessionId) return;
    await startSession({ sessionId, conversationId });
  }, [sessionId, startSession]);

  const endSession = useCallback(async () => {
    if (!sessionId) return;
    setPhase("ending");
    try {
      await endSessionMutation({ sessionId });
      setPhase("done");
    } catch (err) {
      console.error("[SpeechCoach] End session error:", err);
      setPhase("done"); // Still show "done" — analysis may happen in background
    }
  }, [sessionId, endSessionMutation]);

  const reset = useCallback(() => {
    setPhase("idle");
    setSessionId(null);
    setSignedUrl(null);
    setError(null);
  }, []);

  return { phase, sessionId, signedUrl, error, durationMinutes, begin, markActive, endSession, reset };
}
```

- [ ] **Step 2: Implement ActiveSession component**

Create `src/features/speech-coach/components/active-session.tsx`:

> **Note:** `@elevenlabs/react` v1.0.0 uses a `ConversationProvider` context pattern, not a standalone `useConversation` hook. The provider wraps children, and child components access controls via `useConversationControls()` and status via `useConversationStatus()`. The `startSession()` accepts `onConnect: ({ conversationId }) => void` as a callback — this IS how you get the conversationId.

```tsx
"use client";

import {
  ConversationProvider,
  useConversationControls,
  useConversationStatus,
} from "@elevenlabs/react";
import { useCallback, useEffect, useRef } from "react";

import { Button } from "@/shared/components/ui/button";
import { cn } from "@/core/utils";

type Props = {
  signedUrl: string;
  onConversationStarted: (conversationId: string) => void;
  onEnd: () => void;
  durationMinutes: number;
};

export function ActiveSession({ signedUrl, onConversationStarted, onEnd, durationMinutes }: Props) {
  return (
    <ConversationProvider signedUrl={signedUrl}>
      <ActiveSessionInner
        signedUrl={signedUrl}
        onConversationStarted={onConversationStarted}
        onEnd={onEnd}
        durationMinutes={durationMinutes}
      />
    </ConversationProvider>
  );
}

function ActiveSessionInner({ signedUrl, onConversationStarted, onEnd, durationMinutes }: Props) {
  const hasStarted = useRef(false);
  const { startSession, endSession } = useConversationControls();
  const { status } = useConversationStatus();

  const isSpeaking = status === "speaking";
  const isConnected = status === "connected" || status === "speaking" || status === "listening";

  // Start conversation on mount
  useEffect(() => {
    if (hasStarted.current) return;
    hasStarted.current = true;
    startSession({
      onConnect: ({ conversationId }) => {
        onConversationStarted(conversationId);
      },
      onError: (message) => {
        console.error("[SpeechCoach] Conversation error:", message);
        onEnd();
      },
    });
  }, [signedUrl, startSession, onConversationStarted, onEnd]);

  // Detect disconnection
  useEffect(() => {
    if (hasStarted.current && status === "disconnected") {
      onEnd();
    }
  }, [status, onEnd]);

  // Auto-stop after duration
  useEffect(() => {
    const timeout = setTimeout(() => {
      endSession();
    }, durationMinutes * 60 * 1000);
    return () => clearTimeout(timeout);
  }, [durationMinutes, endSession]);

  const handleStop = useCallback(() => {
    endSession();
  }, [endSession]);

  return (
    <div className="flex h-full flex-col items-center justify-center gap-8 p-8">
      {/* Animated indicator */}
      <div className="relative flex items-center justify-center">
        <div
          className={cn(
            "h-32 w-32 rounded-full transition-all duration-500",
            isSpeaking
              ? "scale-110 bg-primary/20 shadow-lg shadow-primary/10"
              : "scale-100 bg-muted/50"
          )}
        />
        <div
          className={cn(
            "absolute h-20 w-20 rounded-full transition-all duration-500",
            isSpeaking
              ? "scale-110 bg-primary/40"
              : "scale-95 bg-muted"
          )}
        />
        <span className="absolute text-3xl">
          {isSpeaking ? "🗣️" : "👂"}
        </span>
      </div>

      {/* Status text */}
      <p className="text-center text-lg text-muted-foreground">
        {!isConnected ? "Connecting..." : isSpeaking ? "Coach is talking..." : "Listening..."}
      </p>

      {/* Stop button */}
      <Button
        onClick={handleStop}
        variant="outline"
        size="lg"
        className="mt-8"
        disabled={!isConnected}
      >
        Stop Session
      </Button>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/features/speech-coach/hooks/use-speech-session.ts src/features/speech-coach/components/active-session.tsx
git commit -m "feat(speech-coach): add useSpeechSession hook + ActiveSession component with ElevenLabs widget"
```

---

## Task 7: Progress Card + Progress Dashboard Components

**Files:**
- Create: `src/features/speech-coach/components/progress-card.tsx`
- Create: `src/features/speech-coach/components/progress-dashboard.tsx`
- Test: `src/features/speech-coach/components/__tests__/progress-card.test.tsx`

- [ ] **Step 1: Write failing test for ProgressCard**

Create `src/features/speech-coach/components/__tests__/progress-card.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ProgressCard } from "../progress-card";

const MOCK_PROGRESS = {
  summary: "Ace practiced /s/ sounds and did great!",
  soundsAttempted: [
    { sound: "/s/", wordsAttempted: 8, approximateSuccessRate: "high" as const, notes: "Strong initial /s/" },
    { sound: "/r/", wordsAttempted: 4, approximateSuccessRate: "low" as const, notes: "Needs more practice" },
  ],
  overallEngagement: "high" as const,
  recommendedNextFocus: ["/r/", "/l/"],
};

describe("ProgressCard", () => {
  it("renders summary text", () => {
    render(<ProgressCard progress={MOCK_PROGRESS} />);
    expect(screen.getByText("Ace practiced /s/ sounds and did great!")).toBeInTheDocument();
  });

  it("renders sounds attempted with success indicators", () => {
    render(<ProgressCard progress={MOCK_PROGRESS} />);
    expect(screen.getByText("/s/")).toBeInTheDocument();
    expect(screen.getByText("/r/")).toBeInTheDocument();
    expect(screen.getByText("8 words")).toBeInTheDocument();
    expect(screen.getByText("4 words")).toBeInTheDocument();
  });

  it("renders recommended next focus", () => {
    render(<ProgressCard progress={MOCK_PROGRESS} />);
    expect(screen.getByText("Next time, try:")).toBeInTheDocument();
    expect(screen.getByText("/r/")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/features/speech-coach/components/__tests__/progress-card.test.tsx`
Expected: FAIL

- [ ] **Step 3: Implement ProgressCard**

Create `src/features/speech-coach/components/progress-card.tsx`:

```tsx
import { cn } from "@/core/utils";

type SoundAttempt = {
  sound: string;
  wordsAttempted: number;
  approximateSuccessRate: "high" | "medium" | "low";
  notes: string;
};

type ProgressData = {
  summary: string;
  soundsAttempted: SoundAttempt[];
  overallEngagement: "high" | "medium" | "low";
  recommendedNextFocus: string[];
};

const RATE_STYLES = {
  high: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  low: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

const ENGAGEMENT_LABELS = {
  high: "Very engaged",
  medium: "Somewhat engaged",
  low: "Needs encouragement",
};

export function ProgressCard({ progress }: { progress: ProgressData }) {
  return (
    <div className="flex flex-col gap-5 rounded-xl bg-muted/30 p-5">
      {/* Summary */}
      <p className="text-sm leading-relaxed text-foreground">{progress.summary}</p>

      {/* Sounds attempted */}
      <div className="flex flex-col gap-2">
        <h4 className="font-manrope text-sm font-semibold text-foreground">Sounds Practiced</h4>
        {progress.soundsAttempted.map((attempt) => (
          <div key={attempt.sound} className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-bold text-foreground">{attempt.sound}</span>
              <span className="text-xs text-muted-foreground">{attempt.wordsAttempted} words</span>
            </div>
            <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", RATE_STYLES[attempt.approximateSuccessRate])}>
              {attempt.approximateSuccessRate}
            </span>
          </div>
        ))}
      </div>

      {/* Engagement */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Engagement:</span>
        <span className="text-xs font-medium text-foreground">
          {ENGAGEMENT_LABELS[progress.overallEngagement]}
        </span>
      </div>

      {/* Recommended next */}
      {progress.recommendedNextFocus.length > 0 && (
        <div>
          <span className="text-xs text-muted-foreground">Next time, try:</span>
          <div className="mt-1 flex gap-1.5">
            {progress.recommendedNextFocus.map((sound) => (
              <span key={sound} className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                {sound}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Implement ProgressDashboard**

Create `src/features/speech-coach/components/progress-dashboard.tsx`:

```tsx
"use client";

import { useQuery } from "convex/react";

import { api } from "../../../../convex/_generated/api";

type ProgressRecord = {
  soundsAttempted: Array<{
    sound: string;
    approximateSuccessRate: "high" | "medium" | "low";
  }>;
  recommendedNextFocus: string[];
};

function computeTrend(records: ProgressRecord[], sound: string): "improving" | "steady" | "needs work" {
  const recent = records
    .flatMap((r) => r.soundsAttempted)
    .filter((s) => s.sound === sound)
    .slice(-5);
  if (recent.length < 2) return "steady";
  const scores = recent.map((s) => (s.approximateSuccessRate === "high" ? 3 : s.approximateSuccessRate === "medium" ? 2 : 1));
  const trend = scores[scores.length - 1] - scores[0];
  if (trend > 0) return "improving";
  if (trend < 0) return "needs work";
  return "steady";
}

const TREND_STYLES = {
  improving: "text-green-600 dark:text-green-400",
  steady: "text-yellow-600 dark:text-yellow-400",
  "needs work": "text-red-600 dark:text-red-400",
};

export function ProgressDashboard() {
  const progress = useQuery(api.speechCoach.getProgress, {});
  const sessions = useQuery(api.speechCoach.getSessionHistory, {});

  if (!progress || !sessions) {
    return <div className="p-6 text-muted-foreground">Loading progress...</div>;
  }

  if (progress.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 p-8 text-center">
        <p className="text-lg font-medium text-foreground">No sessions yet</p>
        <p className="text-sm text-muted-foreground">
          Start a session to see your child's progress here.
        </p>
      </div>
    );
  }

  // Collect all practiced sounds
  const allSounds = [...new Set(progress.flatMap((p) => p.soundsAttempted.map((s) => s.sound)))];
  const totalSessions = sessions.filter((s) => s.status === "analyzed" || s.status === "completed").length;

  // Get latest recommended focus
  const latestRecommendation = progress[progress.length - 1]?.recommendedNextFocus ?? [];

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Session count */}
      <div className="rounded-lg bg-muted/30 p-4">
        <p className="text-sm text-muted-foreground">
          {totalSessions} session{totalSessions !== 1 ? "s" : ""} completed
          {totalSessions < 3 && " — keep it up! Regular practice makes a big difference."}
        </p>
      </div>

      {/* Sound progress table */}
      <div>
        <h3 className="font-manrope text-lg font-semibold text-foreground">Sound Progress</h3>
        <div className="mt-3 flex flex-col gap-2">
          {allSounds.map((sound) => {
            const trend = computeTrend(progress, sound);
            return (
              <div key={sound} className="flex items-center justify-between rounded-lg bg-muted/20 px-4 py-3">
                <span className="font-mono text-sm font-bold text-foreground">{sound}</span>
                <span className={`text-sm font-medium ${TREND_STYLES[trend]}`}>
                  {trend === "improving" ? "↑ Improving" : trend === "steady" ? "→ Steady" : "↓ Needs work"}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recommended focus */}
      {latestRecommendation.length > 0 && (
        <div>
          <h3 className="font-manrope text-lg font-semibold text-foreground">Recommended Focus</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Based on recent sessions, try focusing on:{" "}
            <span className="font-medium text-foreground">{latestRecommendation.join(", ")}</span>
          </p>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 5: Run tests**

Run: `npx vitest run src/features/speech-coach/components/__tests__/progress-card.test.tsx`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/features/speech-coach/components/progress-card.tsx src/features/speech-coach/components/progress-dashboard.tsx src/features/speech-coach/components/__tests__/progress-card.test.tsx
git commit -m "feat(speech-coach): add ProgressCard + ProgressDashboard components"
```

---

## Task 8: Session History Component

**Files:**
- Create: `src/features/speech-coach/components/session-history.tsx`

- [ ] **Step 1: Implement SessionHistory**

Create `src/features/speech-coach/components/session-history.tsx`:

```tsx
"use client";

import { useQuery } from "convex/react";
import { useState } from "react";

import { cn } from "@/core/utils";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { ProgressCard } from "./progress-card";

const STATUS_STYLES = {
  configuring: "bg-muted text-muted-foreground",
  active: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  completed: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  analyzed: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  failed: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

const STATUS_LABELS = {
  configuring: "Setting up",
  active: "In progress",
  completed: "Reviewing",
  analyzed: "Complete",
  failed: "Failed",
};

function formatDuration(startedAt?: number, endedAt?: number): string {
  if (!startedAt || !endedAt) return "—";
  const seconds = Math.round((endedAt - startedAt) / 1000);
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}

function formatDate(timestamp?: number): string {
  if (!timestamp) return "—";
  return new Date(timestamp).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function SessionHistory() {
  const sessions = useQuery(api.speechCoach.getSessionHistory, {});
  const [expandedId, setExpandedId] = useState<Id<"speechCoachSessions"> | null>(null);

  if (!sessions) {
    return <div className="p-6 text-muted-foreground">Loading sessions...</div>;
  }

  if (sessions.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 p-8 text-center">
        <p className="text-lg font-medium text-foreground">No sessions yet</p>
        <p className="text-sm text-muted-foreground">
          Your session history will appear here after your first coaching session.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 p-6">
      {sessions.map((session) => (
        <div key={session._id} className="rounded-xl bg-muted/20">
          <button
            type="button"
            onClick={() => setExpandedId(expandedId === session._id ? null : session._id)}
            className="flex w-full items-center justify-between gap-4 p-4 text-left"
          >
            <div className="flex flex-col gap-1">
              <span className="text-sm font-medium text-foreground">
                {formatDate(session.startedAt ?? session._creationTime)}
              </span>
              <div className="flex flex-wrap gap-1.5">
                {session.config.targetSounds.map((sound) => (
                  <span key={sound} className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                    {sound}
                  </span>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground">
                {formatDuration(session.startedAt, session.endedAt)}
              </span>
              <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", STATUS_STYLES[session.status as keyof typeof STATUS_STYLES])}>
                {STATUS_LABELS[session.status as keyof typeof STATUS_LABELS]}
              </span>
            </div>
          </button>

          {expandedId === session._id && (
            <ExpandedDetail sessionId={session._id} />
          )}
        </div>
      ))}
    </div>
  );
}

function ExpandedDetail({ sessionId }: { sessionId: Id<"speechCoachSessions"> }) {
  const detail = useQuery(api.speechCoach.getSessionDetail, { sessionId });

  if (!detail) return <div className="px-4 pb-4 text-sm text-muted-foreground">Loading...</div>;
  if (!detail.progress) {
    return (
      <div className="px-4 pb-4 text-sm text-muted-foreground">
        {detail.session?.status === "failed"
          ? detail.session.errorMessage ?? "Session did not complete."
          : "Session is still being reviewed."}
      </div>
    );
  }

  return (
    <div className="px-4 pb-4">
      <ProgressCard progress={detail.progress} />
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/features/speech-coach/components/session-history.tsx
git commit -m "feat(speech-coach): add SessionHistory component with expandable details"
```

---

## Task 9: Wire Up SpeechCoachPage — Full Tab Layout

**Files:**
- Modify: `src/features/speech-coach/components/speech-coach-page.tsx`

- [ ] **Step 1: Replace placeholder with full implementation**

Rewrite `src/features/speech-coach/components/speech-coach-page.tsx`:

```tsx
"use client";

import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { useState } from "react";

import { cn } from "@/core/utils";
import { api } from "../../../../convex/_generated/api";
import { ActiveSession } from "./active-session";
import { ProgressDashboard } from "./progress-dashboard";
import { SessionConfig } from "./session-config";
import { SessionHistory } from "./session-history";
import { useSpeechSession } from "../hooks/use-speech-session";

type Tab = "new" | "history" | "progress";

export function SpeechCoachPage() {
  const { isSignedIn, isLoaded } = useUser();
  const [activeTab, setActiveTab] = useState<Tab>("new");
  const session = useSpeechSession();

  // Get last recommendation for quick-start
  const progress = useQuery(api.speechCoach.getProgress, isSignedIn ? {} : "skip");
  const lastRecommended = progress?.[progress.length - 1]?.recommendedNextFocus;

  if (!isLoaded) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
        <h2 className="font-manrope text-2xl font-bold text-foreground">Speech Coach</h2>
        <p className="text-muted-foreground">Sign in to start a speech coaching session.</p>
      </div>
    );
  }

  // Active session takes over the whole screen
  if (session.phase === "active" && session.signedUrl && session.sessionId) {
    return (
      <ActiveSession
        signedUrl={session.signedUrl}
        onConversationStarted={(id) => session.markActive(id)}
        onEnd={() => session.endSession()}
        durationMinutes={session.durationMinutes}
      />
    );
  }

  // Post-session "great job" screen
  if (session.phase === "ending" || session.phase === "done") {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-6 p-8">
        <p className="text-4xl">🎉</p>
        <h2 className="font-manrope text-2xl font-bold text-foreground">Great job!</h2>
        <p className="text-muted-foreground">
          {session.phase === "ending" ? "Reviewing the session..." : "Session complete!"}
        </p>
        {session.phase === "done" && (
          <button
            type="button"
            onClick={() => {
              session.reset();
              setActiveTab("history");
            }}
            className="text-sm font-medium text-primary underline"
          >
            View results
          </button>
        )}
      </div>
    );
  }

  // Error state
  if (session.phase === "error") {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
        <p className="text-4xl">😕</p>
        <h2 className="font-manrope text-xl font-bold text-foreground">Something went wrong</h2>
        <p className="text-sm text-muted-foreground">{session.error}</p>
        <button
          type="button"
          onClick={session.reset}
          className="text-sm font-medium text-primary underline"
        >
          Try again
        </button>
      </div>
    );
  }

  // Tab view (idle / connecting)
  const TABS: { id: Tab; label: string }[] = [
    { id: "new", label: "New Session" },
    { id: "history", label: "History" },
    { id: "progress", label: "Progress" },
  ];

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-border/50 px-6 pt-6 pb-4">
        <h1 className="font-manrope text-2xl font-bold text-foreground">Speech Coach</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Interactive voice sessions to help your child practice speech sounds
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border/50 px-6">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "border-b-2 px-4 py-3 text-sm font-medium transition-colors",
              activeTab === tab.id
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === "new" && (
          <div className="mx-auto max-w-lg p-6">
            <SessionConfig
              onStart={session.begin}
              lastRecommended={lastRecommended}
              isLoading={session.phase === "connecting"}
            />
          </div>
        )}
        {activeTab === "history" && <SessionHistory />}
        {activeTab === "progress" && <ProgressDashboard />}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify app compiles**

Run: `npm run dev` — navigate to `/speech-coach`. Verify:
- Tabs work (New Session, History, Progress)
- Config form renders with sound checkboxes, age toggle, duration buttons
- Sign-out shows auth gate message

- [ ] **Step 3: Commit**

```bash
git add src/features/speech-coach/components/speech-coach-page.tsx
git commit -m "feat(speech-coach): wire up full page with tabs, session flow, and error states"
```

---

## Task 10: Curriculum Data + Seed Script

**Files:**
- Create: `src/features/speech-coach/lib/curriculum-data.ts`
- Create: `scripts/seed-speech-curriculum.ts`

- [ ] **Step 1: Create curriculum data**

Create `src/features/speech-coach/lib/curriculum-data.ts` with the full exercise curriculum. This is a long file — it contains articulation cues, word lists, modeling scripts, and session management phrases for all 8 sound groups across both age ranges. See spec Section 6 for the structure.

```typescript
export type SoundExercise = {
  sound: string;
  articulationCue: string;
  ages24: {
    beginnerWords: string[];
    modelingScript: string;
    praiseVariants: string[];
  };
  ages57: {
    beginnerWords: string[];
    intermediateWords: string[];
    advancedPhrases: string[];
    modelingScript: string;
  };
};

export const SOUND_EXERCISES: SoundExercise[] = [
  {
    sound: "/s/ and /z/",
    articulationCue: "Make a snake sound! Put your teeth close together and blow air out like a snake going sssssss.",
    ages24: {
      beginnerWords: ["sun", "sock", "sit", "see", "soup", "sand"],
      modelingScript: "Let's play the snake game! I'll say a word and you try it after me. Ready? Ssssun! Your turn!",
      praiseVariants: ["Wow, great snake sound!", "I heard that S!", "You're getting so good at this!"],
    },
    ages57: {
      beginnerWords: ["sun", "sock", "sit", "see", "soup", "sand", "story", "seven", "sister"],
      intermediateWords: ["basket", "whistle", "outside", "yesterday", "dinosaur"],
      advancedPhrases: ["I see six snakes", "Sam sits on the sofa", "The sun is shining"],
      modelingScript: "We're going to practice words with the /s/ sound. Some are tricky — they have /s/ hiding in the middle! Listen first, then you try.",
    },
  },
  {
    sound: "/r/",
    articulationCue: "Make your tongue into a tiny cup at the back of your mouth. Say rrrrr like a little engine!",
    ages24: {
      beginnerWords: ["red", "run", "rain", "ride", "rock", "rip"],
      modelingScript: "Let's make engine sounds! Rrrrred! Can you say that with me?",
      praiseVariants: ["Great engine sound!", "I heard your R!", "That was awesome!"],
    },
    ages57: {
      beginnerWords: ["red", "run", "rain", "ride", "rock", "rip", "read", "room"],
      intermediateWords: ["orange", "airplane", "library", "tomorrow", "strawberry"],
      advancedPhrases: ["The red rabbit runs", "I read a really great book", "The rain is really heavy"],
      modelingScript: "The /r/ sound can be tricky! Let's practice — I'll say the word slowly, and you try to copy exactly what my mouth does.",
    },
  },
  {
    sound: "/l/",
    articulationCue: "Put the tip of your tongue right behind your top teeth, up on that little bumpy spot, and let the sound come out the sides.",
    ages24: {
      beginnerWords: ["lap", "lip", "log", "look", "leaf", "light"],
      modelingScript: "Let's practice our L sound! Touch your tongue up top — llllap! You try!",
      praiseVariants: ["Your tongue went right to the top!", "Great L sound!", "You're doing amazing!"],
    },
    ages57: {
      beginnerWords: ["lap", "lip", "log", "look", "leaf", "light", "love", "lake"],
      intermediateWords: ["balloon", "pillow", "jelly", "yellow", "elephant"],
      advancedPhrases: ["I love lemon lollipops", "The little lion is lazy", "Look at the lovely lake"],
      modelingScript: "Put your tongue tip up behind your top teeth. Feel that bumpy spot? That's where L lives! Let's try some words.",
    },
  },
  {
    sound: "/th/",
    articulationCue: "Stick your tongue out just a tiny bit between your teeth. Now blow air over it — thhhh!",
    ages24: {
      beginnerWords: ["the", "this", "that", "them", "three", "thumb"],
      modelingScript: "Let's make a silly face! Stick your tongue out just a little — thhhh! Now let's try 'the'. Thhhhe!",
      praiseVariants: ["I saw your tongue!", "Great job with that tricky sound!", "You're doing so well!"],
    },
    ages57: {
      beginnerWords: ["the", "this", "that", "them", "three", "thumb", "think", "throw"],
      intermediateWords: ["birthday", "nothing", "toothbrush", "bathrobe", "feather"],
      advancedPhrases: ["I think there are three things", "Thank you for the birthday card", "The feather is thin"],
      modelingScript: "The /th/ sound needs your tongue to peek out between your teeth. Watch — thhhhink. See my tongue? Now you try!",
    },
  },
  {
    sound: "/ch/ and /sh/",
    articulationCue: "For /ch/, say 't' then 'sh' really fast together — ch! For /sh/, put your finger over your lips and go shhhh like you're telling a secret!",
    ages24: {
      beginnerWords: ["shoe", "ship", "shop", "chin", "chip", "chop"],
      modelingScript: "Let's play the secret game! Shhhh — shoe! Now a chomping sound — ch-ch-chip! Your turn!",
      praiseVariants: ["What a great secret sound!", "I heard that ch!", "You're a superstar!"],
    },
    ages57: {
      beginnerWords: ["shoe", "ship", "shop", "chin", "chip", "chop", "shell", "cheese"],
      intermediateWords: ["fishing", "ocean", "machine", "kitchen", "chocolate"],
      advancedPhrases: ["She chose chocolate chip cheese", "The ship is at the shore", "I need new shoes for school"],
      modelingScript: "We have two sounds to practice! /sh/ is the quiet sound — shhhh. /ch/ is the chomping sound — ch! Let's try words with each.",
    },
  },
  {
    sound: "/f/ and /v/",
    articulationCue: "Gently bite your bottom lip with your top teeth. For /f/, blow air out. For /v/, make your voice buzz while you do it!",
    ages24: {
      beginnerWords: ["fan", "fish", "foot", "van", "vine", "vet"],
      modelingScript: "Bite your bottom lip gently — now blow! Fffff-fan! Can you feel the air on your lip? Now let's buzz — vvvv-van!",
      praiseVariants: ["Great lip biting!", "I felt the air!", "Awesome buzzing sound!"],
    },
    ages57: {
      beginnerWords: ["fan", "fish", "foot", "fun", "van", "vine", "vet", "very"],
      intermediateWords: ["coffee", "muffin", "giraffe", "river", "travel", "seven"],
      advancedPhrases: ["Five funny fish", "The van drove very fast", "I found a feather on the floor"],
      modelingScript: "/f/ and /v/ are mouth twins! They look the same but /v/ has your voice buzzing. Feel your throat — vvvv. No buzz — ffff.",
    },
  },
  {
    sound: "/k/ and /g/",
    articulationCue: "Push the back of your tongue up to the roof of your mouth way in the back. For /k/, let it pop! For /g/, add your voice!",
    ages24: {
      beginnerWords: ["cat", "cup", "key", "go", "get", "give"],
      modelingScript: "Let's make popping sounds in the back of your mouth! K-k-cat! Now with your voice — g-g-go! Your turn!",
      praiseVariants: ["Great back sound!", "I heard that pop!", "You got it!"],
    },
    ages57: {
      beginnerWords: ["cat", "cup", "key", "kick", "go", "get", "give", "game"],
      intermediateWords: ["monkey", "doctor", "pocket", "tiger", "bigger", "dragon"],
      advancedPhrases: ["The cat can kick the cup", "Give the game to the girl", "The monkey climbed the big tree"],
      modelingScript: "These sounds happen way in the back of your mouth. Touch your throat — feel that? /k/ pops without buzz, /g/ has the buzz!",
    },
  },
  {
    sound: "Blends",
    articulationCue: "Blends are two sounds smooshed together! Say each sound, then try to say them faster and faster until they become one!",
    ages24: {
      beginnerWords: ["stop", "spin", "star", "blue", "play", "tree"],
      modelingScript: "Let's smoosh two sounds together! S-t-op... st-op... stop! You try!",
      praiseVariants: ["You smooshed them together!", "Two sounds at once — wow!", "Great blending!"],
    },
    ages57: {
      beginnerWords: ["stop", "spin", "star", "blue", "play", "tree", "slide", "snap"],
      intermediateWords: ["splash", "string", "strong", "scratch", "blanket", "crayon"],
      advancedPhrases: ["The blue train stopped at the station", "She drew a straight line with the crayon", "The strong spider spun a web"],
      modelingScript: "Blends put two sounds right next to each other. Let's slow it down first: s...t...op. Now faster: stop! Ready for some tricky ones?",
    },
  },
];

export const SESSION_OPENERS = {
  "2-4": [
    "Hi there! I'm your speech coach! Do you want to play some word games with me?",
    "Hello friend! Are you ready to make some fun sounds today?",
    "Hey! Can you tell me your name? Awesome! Let's play!",
  ],
  "5-7": [
    "Hey there! I'm your speech coach. We're going to practice some sounds today — it's going to be fun!",
    "Hi! Ready to work on some tricky sounds? I bet you're going to do great!",
    "Welcome back! Let's warm up with some easy words first, then try some harder ones.",
  ],
};

export const TRANSITION_PHRASES = [
  "You did so well with those! Want to try something a little different?",
  "Great job! Let's switch to a new sound now.",
  "Awesome work! Ready for the next one?",
  "You're doing amazing! Let's try a different sound.",
];

export const WIND_DOWN_SCRIPTS = {
  "2-4": "You worked so hard today! High five! Tell your mom or dad what sounds we practiced!",
  "5-7": "Great session! You practiced really well today. Keep trying those sounds this week — the more you practice, the easier they get!",
};

export const ENGAGEMENT_RECOVERY = [
  "That's cool! Hey, can you say this silly word for me?",
  "I know a really funny word — want to hear it? Now you try!",
  "Let's play a quick game — I'll say a word and you say it back as fast as you can!",
  "You know what? Let's try something different. This one's going to be fun!",
];

/**
 * Compiles all curriculum data into a single text document
 * suitable for uploading as an ElevenLabs knowledge base.
 */
export function compileCurriculumText(): string {
  const sections: string[] = [];

  sections.push("# Speech Coach Exercise Curriculum\n");

  for (const exercise of SOUND_EXERCISES) {
    sections.push(`## ${exercise.sound}\n`);
    sections.push(`### Articulation Cue\n${exercise.articulationCue}\n`);

    sections.push(`### Ages 2-4\n`);
    sections.push(`**Beginner Words:** ${exercise.ages24.beginnerWords.join(", ")}`);
    sections.push(`**Modeling Script:** ${exercise.ages24.modelingScript}`);
    sections.push(`**Praise Variants:** ${exercise.ages24.praiseVariants.join(" | ")}\n`);

    sections.push(`### Ages 5-7\n`);
    sections.push(`**Beginner Words:** ${exercise.ages57.beginnerWords.join(", ")}`);
    sections.push(`**Intermediate Words:** ${exercise.ages57.intermediateWords.join(", ")}`);
    sections.push(`**Advanced Phrases:** ${exercise.ages57.advancedPhrases.join(" | ")}`);
    sections.push(`**Modeling Script:** ${exercise.ages57.modelingScript}\n`);
  }

  sections.push("## Session Management\n");
  sections.push(`### Openers (Ages 2-4)\n${SESSION_OPENERS["2-4"].join("\n")}\n`);
  sections.push(`### Openers (Ages 5-7)\n${SESSION_OPENERS["5-7"].join("\n")}\n`);
  sections.push(`### Transition Phrases\n${TRANSITION_PHRASES.join("\n")}\n`);
  sections.push(`### Wind-Down (Ages 2-4)\n${WIND_DOWN_SCRIPTS["2-4"]}\n`);
  sections.push(`### Wind-Down (Ages 5-7)\n${WIND_DOWN_SCRIPTS["5-7"]}\n`);
  sections.push(`### Engagement Recovery\n${ENGAGEMENT_RECOVERY.join("\n")}\n`);

  return sections.join("\n");
}
```

- [ ] **Step 2: Create seed script**

Create `scripts/seed-speech-curriculum.ts`:

```typescript
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { compileCurriculumText } from "../src/features/speech-coach/lib/curriculum-data";

async function main() {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  const agentId = process.env.ELEVENLABS_AGENT_ID;

  if (!apiKey) {
    console.error("ELEVENLABS_API_KEY not set in .env.local");
    process.exit(1);
  }
  if (!agentId) {
    console.error("ELEVENLABS_AGENT_ID not set in .env.local (needed for local seed script)");
    process.exit(1);
  }

  const curriculum = compileCurriculumText();
  console.log(`Compiled curriculum: ${curriculum.length} characters`);

  // Upload as knowledge base
  console.log(`Uploading to agent ${agentId}...`);

  const response = await fetch(
    `https://api.elevenlabs.io/v1/convai/agents/${agentId}/add-to-knowledge-base`,
    {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: "Speech Coach Curriculum",
        text: curriculum,
      }),
    }
  );

  if (!response.ok) {
    const body = await response.text();
    console.error(`Upload failed (${response.status}):`, body);
    process.exit(1);
  }

  const result = await response.json();
  console.log("Knowledge base uploaded successfully:", result);
}

main().catch(console.error);
```

- [ ] **Step 3: Commit**

```bash
git add src/features/speech-coach/lib/curriculum-data.ts scripts/seed-speech-curriculum.ts
git commit -m "feat(speech-coach): add curriculum data (8 sound groups) + ElevenLabs seed script"
```

---

## Task 11: Create ElevenLabs Agent + Upload Knowledge Base

This task uses the ElevenLabs MCP tools to create the actual agent. It requires API access and is a one-time setup.

- [ ] **Step 1: Create the ElevenLabs agent**

Use the `mcp__ElevenLabs__create_agent` tool:
- name: "Bridges Speech Coach"
- voice_id: "hpp4J3VqNfWAUOO0d1Us" (Bella)
- first_message: "Hi there! I'm your speech coach! Are you ready to play some fun word games with me today?"
- system_prompt: (see spec Section 1 for full system prompt — parameterized with default config)
- asr_quality: "high"
- turn_timeout: 10
- stability: 0.6
- similarity_boost: 0.8
- record_voice: true
- optimize_streaming_latency: 3
- max_duration_seconds: 600

- [ ] **Step 2: Save the agent ID**

The response returns an `agent_id`. This needs to be set in two places:
1. **Convex Dashboard** → Settings → Environment Variables → `ELEVENLABS_AGENT_ID`
2. **`.env.local`** → `ELEVENLABS_AGENT_ID=<id>` (for seed script)

- [ ] **Step 3: Upload the curriculum knowledge base**

Run: `npx tsx scripts/seed-speech-curriculum.ts`
Expected: "Knowledge base uploaded successfully"

If the seed script endpoint format differs from what ElevenLabs expects, use `mcp__ElevenLabs__add_knowledge_base_to_agent` MCP tool instead with `text` parameter set to the compiled curriculum.

- [ ] **Step 4: Commit env changes**

No code changes to commit — env vars are set in dashboard and local file only.

---

## Task 12: Integration Test — Full Flow

- [ ] **Step 1: Run the full test suite**

```bash
npx vitest run
```

Expected: All existing tests pass, plus new speech coach tests pass.

- [ ] **Step 2: Manual smoke test**

Run: `npm run dev`

1. Navigate to `/speech-coach`
2. Verify tabs render (New Session, History, Progress)
3. Select sounds, age range, duration → click "Start Session"
4. Verify mic permission prompt appears
5. If ElevenLabs agent is configured: verify voice connection establishes and agent speaks
6. Stop the session → verify "Great job!" screen
7. Wait for analysis → verify progress card appears in History tab
8. Check Progress tab shows sound data

- [ ] **Step 3: Commit any fixes discovered during integration**

```bash
git add -A
git commit -m "fix(speech-coach): integration fixes from smoke test"
```

---

## Summary

| Task | What It Delivers |
|------|-----------------|
| 1 | Schema tables in Convex |
| 2 | Queries + mutations for session lifecycle |
| 3 | Server-side actions (signed URL + analysis pipeline) |
| 4 | Route, sidebar nav, page shell |
| 5 | `@elevenlabs/react` + session config UI |
| 6 | Live session component + lifecycle hook |
| 7 | Progress card + dashboard |
| 8 | Session history with expandable details |
| 9 | Full page wiring with tabs and state machine |
| 10 | Curriculum data + seed script |
| 11 | ElevenLabs agent creation + knowledge base upload |
| 12 | Integration testing + smoke test |
