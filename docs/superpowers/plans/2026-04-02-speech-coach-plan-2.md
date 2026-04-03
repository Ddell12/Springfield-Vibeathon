# Speech Coach — Plan 2: Active Session, Engagement Mechanics, Coach Quality

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the live session real — implement the three agent tools (signal_state, log_attempt, advance_target), wire up the client data channel, replace the static active-session screen with a responsive child-facing UI (prompt state card, progress dots, confetti), add a caregiver guidance strip, and upgrade the agent prompt with a clinical protocol + skill injection pipeline.

**Architecture:** The LiveKit agent (TypeScript worker in `src/features/speech-coach/livekit/`) is upgraded from a stub to a class that receives the room reference and creates `llm.tool()` definitions via `@livekit/agents`. Tools publish data to the client via `room.localParticipant.publishData()` and log attempts to Convex via `ConvexHttpClient`. On the client, `ActiveSession` renders an `AgentDataListener` component inside the `LiveKitRoom` which subscribes to `RoomEvent.DataReceived` and updates `visual` state. The clinical prompt is built in `buildSpeechCoachRuntimeInstructions` which now injects per-skill clinical modules and age-appropriate language tiers.

**Tech Stack:** `@livekit/agents` (Node.js), `livekit-client`, `@livekit/components-react`, Zod, Convex, Vitest, React Testing Library

**Spec:** `docs/superpowers/specs/2026-04-02-speech-coach-redesign-design.md` §2 and §4

**HIPAA note:** `rawAttempts` contains target labels (potential PHI). Never expose raw attempts in client-facing exports. SLP-only rendering enforced in Plan 3.

---

## File Map

**Modify:**
- `convex/schema.ts` — add `rawAttempts` to `speechCoachSessions`; add `reducedMotion` to `speechCoachConfig` (if not done in Plan 1)
- `convex/speechCoach.ts` — add `logAttempt` internalMutation
- `convex/speechCoachRuntimeActions.ts` — add `logAttemptFromRuntime` action (runtime secret gated)
- `src/features/speech-coach/livekit/tools.ts` — implement all 3 tools using `llm.tool()`
- `src/features/speech-coach/livekit/agent.ts` — accept room + tool config; wire `llm.tool()` instances
- `src/features/speech-coach/livekit/entrypoint.ts` — pass room + env vars to agent
- `src/features/speech-coach/livekit/__tests__/agent.test.ts` — update for new constructor signature
- `src/features/speech-coach/lib/runtime-config.ts` — replace generic base with clinical protocol + skill injection
- `src/features/speech-coach/lib/session-guidance.ts` — add age-appropriate language tier
- `src/features/speech-coach/lib/__tests__/runtime-config.test.ts` — test clinical prompt content
- `src/features/speech-coach/lib/__tests__/session-guidance.test.ts` — test age tier injection
- `src/features/speech-coach/components/active-session.tsx` — data channel subscription, prompt state card, guidance strip, confetti, dots, duration options
- `src/features/speech-coach/components/session-config.tsx` — add 8 and 15 min duration options
- `src/features/speech-coach/components/__tests__/active-session.test.tsx` — test new visual states

**Create:**
- `src/features/speech-coach/components/prompt-state-card.tsx` — 4-state animated card
- `src/features/speech-coach/components/__tests__/prompt-state-card.test.tsx`
- `src/features/speech-coach/components/caregiver-guidance-strip.tsx` — phase-aware, dismissible
- `src/features/speech-coach/components/__tests__/caregiver-guidance-strip.test.tsx`

---

## Task 1: Schema — add rawAttempts to speechCoachSessions

**Files:**
- Modify: `convex/schema.ts`

- [ ] **Step 1.1: Add rawAttempts field**

In `convex/schema.ts`, inside the `speechCoachSessions` table definition, add after `rawTranscriptTurns`:

```typescript
// Before:
    rawTranscriptTurns: v.optional(v.array(
      v.object({

// After (insert before rawTranscriptTurns):
    rawAttempts: v.optional(v.array(v.object({
      targetLabel: v.string(),
      outcome: v.union(
        v.literal("correct"),
        v.literal("approximate"),
        v.literal("incorrect"),
        v.literal("no_response")
      ),
      retryCount: v.number(),
      timestampMs: v.number(),
    }))),
    rawTranscriptTurns: v.optional(v.array(
      v.object({
```

- [ ] **Step 1.2: Verify schema compiles**

```bash
cd /Users/desha/Springfield-Vibeathon
npx convex dev --once 2>&1 | tail -10
```

Expected: exits 0.

- [ ] **Step 1.3: Commit**

```bash
git add convex/schema.ts
git commit -m "feat(schema): add rawAttempts to speechCoachSessions"
```

---

## Task 2: Convex — logAttempt internalMutation + logAttemptFromRuntime action

**Files:**
- Modify: `convex/speechCoach.ts`
- Modify: `convex/speechCoachRuntimeActions.ts`

- [ ] **Step 2.1: Add logAttempt internalMutation to speechCoach.ts**

At the bottom of `convex/speechCoach.ts` (before the standalone section), add:

```typescript
export const logAttempt = internalMutation({
  args: {
    sessionId: v.id("speechCoachSessions"),
    targetLabel: v.string(),
    outcome: v.union(
      v.literal("correct"),
      v.literal("approximate"),
      v.literal("incorrect"),
      v.literal("no_response")
    ),
    retryCount: v.number(),
    timestampMs: v.number(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) throw new ConvexError("Session not found");
    const existing = session.rawAttempts ?? [];
    await ctx.db.patch(args.sessionId, {
      rawAttempts: [
        ...existing,
        {
          targetLabel: args.targetLabel,
          outcome: args.outcome,
          retryCount: args.retryCount,
          timestampMs: args.timestampMs,
        },
      ],
    });
  },
});
```

- [ ] **Step 2.2: Add logAttemptFromRuntime action to speechCoachRuntimeActions.ts**

At the bottom of `convex/speechCoachRuntimeActions.ts`, add:

```typescript
export const logAttemptFromRuntime = action({
  args: {
    sessionId: v.id("speechCoachSessions"),
    runtimeSecret: v.string(),
    targetLabel: v.string(),
    outcome: v.union(
      v.literal("correct"),
      v.literal("approximate"),
      v.literal("incorrect"),
      v.literal("no_response")
    ),
    retryCount: v.number(),
    timestampMs: v.number(),
  },
  handler: async (ctx, args) => {
    const expectedSecret = process.env.SPEECH_COACH_RUNTIME_SECRET;
    if (!expectedSecret) throw new ConvexError("SPEECH_COACH_RUNTIME_SECRET not configured");
    if (args.runtimeSecret !== expectedSecret) throw new ConvexError("Invalid runtime secret");

    await ctx.runMutation(internal.speechCoach.logAttempt, {
      sessionId: args.sessionId,
      targetLabel: args.targetLabel,
      outcome: args.outcome,
      retryCount: args.retryCount,
      timestampMs: args.timestampMs,
    });

    return { ok: true as const };
  },
});
```

- [ ] **Step 2.3: Verify Convex compiles**

```bash
npx convex dev --once 2>&1 | tail -10
```

Expected: exits 0.

- [ ] **Step 2.4: Commit**

```bash
git add convex/speechCoach.ts convex/speechCoachRuntimeActions.ts
git commit -m "feat(convex): add logAttempt mutation and logAttemptFromRuntime action"
```

---

## Task 3: Implement speechCoachTools with llm.tool()

**Files:**
- Modify: `src/features/speech-coach/livekit/tools.ts`

- [ ] **Step 3.1: Replace the empty tools stub with real implementations**

Replace the full contents of `src/features/speech-coach/livekit/tools.ts`:

```typescript
// Speech coach tool definitions for the LiveKit agent.
//
// These tools drive the child-facing visual state in real time:
//   signal_state  — updates the target label/image and prompt state shown on screen
//   log_attempt   — records each child response to Convex for post-session analysis
//   advance_target — signals a move to the next target word
//
// Tools publish data via room.localParticipant.publishData() (RoomEvent.DataReceived on client).
// Attempts are persisted via ConvexHttpClient calling logAttemptFromRuntime.

import { llm } from "@livekit/agents";
import { ConvexHttpClient } from "convex/browser";
import type { Room } from "livekit-client";
import { z } from "zod";

import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

export type AgentVisualMessage =
  | {
      type: "visual_state";
      targetLabel: string;
      targetImageUrl?: string;
      promptState: "listen" | "your_turn" | "try_again" | "nice_job";
      totalCorrect: number;
    }
  | {
      type: "advance_target";
      nextLabel: string;
    };

type ToolDeps = {
  room: Room;
  sessionId: string;
  convexUrl: string;
  runtimeSecret: string;
};

function publishToClient(room: Room, msg: AgentVisualMessage): void {
  // Fire-and-forget — visual updates are best-effort; don't block the agent
  void room.localParticipant
    .publishData(new TextEncoder().encode(JSON.stringify(msg)), { reliable: true })
    .catch((err) => console.warn("[speech-coach] publishData failed:", err));
}

export function createSpeechCoachTools(deps: ToolDeps) {
  const convex = new ConvexHttpClient(deps.convexUrl);

  return {
    signal_state: llm.tool({
      description:
        "Update the visual state shown to the child on screen. Call this at the start of each new target word and after each prompt phase change (listen, your_turn, try_again, nice_job). This drives the visual display the child sees — always call it.",
      parameters: z.object({
        targetLabel: z.string().describe("The target word or sound being practiced, e.g. 'sun'"),
        targetImageUrl: z
          .string()
          .optional()
          .describe("Optional image URL illustrating the target word"),
        promptState: z
          .enum(["listen", "your_turn", "try_again", "nice_job"])
          .describe(
            "listen = coach is about to model; your_turn = child should attempt; try_again = one more try; nice_job = correct attempt"
          ),
        totalCorrect: z
          .number()
          .int()
          .describe("Running count of correct attempts this session"),
      }),
      execute: async ({ targetLabel, targetImageUrl, promptState, totalCorrect }) => {
        publishToClient(deps.room, {
          type: "visual_state",
          targetLabel,
          targetImageUrl,
          promptState,
          totalCorrect,
        });
        return "Visual state updated";
      },
    }),

    log_attempt: llm.tool({
      description:
        "Record the child's response to a practice word. Call this immediately after every child response — correct, approximate, incorrect, or no response. This data is used for the post-session summary.",
      parameters: z.object({
        targetLabel: z
          .string()
          .describe("The word the child was attempting, e.g. 'sun'"),
        outcome: z
          .enum(["correct", "approximate", "incorrect", "no_response"])
          .describe(
            "correct = accurate production; approximate = close but not quite; incorrect = clear error; no_response = child did not attempt"
          ),
        retryCount: z
          .number()
          .int()
          .describe(
            "Number of cue levels used before this attempt: 0 = spontaneous, 1 = model, 2 = phonetic cue, 3+ = direct correction"
          ),
      }),
      execute: async ({ targetLabel, outcome, retryCount }) => {
        try {
          await convex.action(api.speechCoachRuntimeActions.logAttemptFromRuntime, {
            sessionId: deps.sessionId as Id<"speechCoachSessions">,
            runtimeSecret: deps.runtimeSecret,
            targetLabel,
            outcome,
            retryCount,
            timestampMs: Date.now(),
          });
        } catch (err) {
          // Log but don't crash the session — attempt logging is non-critical
          console.warn("[speech-coach] logAttempt failed:", err);
        }
        return "Attempt logged";
      },
    }),

    advance_target: llm.tool({
      description:
        "Signal that you are moving to the next target word. Call this before introducing a new word so the child's screen updates to show the new target.",
      parameters: z.object({
        nextLabel: z.string().describe("The new target word or sound, e.g. 'sock'"),
      }),
      execute: async ({ nextLabel }) => {
        publishToClient(deps.room, { type: "advance_target", nextLabel });
        return "Target advanced";
      },
    }),
  };
}
```

- [ ] **Step 3.2: Commit**

```bash
git add src/features/speech-coach/livekit/tools.ts
git commit -m "feat(speech-coach): implement signal_state, log_attempt, advance_target tools"
```

---

## Task 4: Wire agent.ts to use real tools

**Files:**
- Modify: `src/features/speech-coach/livekit/agent.ts`
- Modify: `src/features/speech-coach/livekit/__tests__/agent.test.ts`

- [ ] **Step 4.1: Update agent.ts**

Replace the full contents of `src/features/speech-coach/livekit/agent.ts`:

```typescript
import { voice } from "@livekit/agents";
import type { Room } from "livekit-client";

import { createSpeechCoachTools } from "./tools";

type SpeechCoachAgentConfig = {
  instructions: string;
  room: Room;
  sessionId: string;
  convexUrl: string;
  runtimeSecret: string;
  targetItems?: Array<{ id: string; label: string; visualUrl?: string }>;
};

export function createSpeechCoachAgent(config: SpeechCoachAgentConfig): voice.Agent {
  const tools = createSpeechCoachTools({
    room: config.room,
    sessionId: config.sessionId,
    convexUrl: config.convexUrl,
    runtimeSecret: config.runtimeSecret,
  });

  const targetSummary = (config.targetItems ?? [])
    .map((item) => `${item.label}${item.visualUrl ? ` (${item.visualUrl})` : ""}`)
    .join(", ");

  const instructions =
    targetSummary.length > 0
      ? `${config.instructions}\nUse only these planned target items during prompting: ${targetSummary}`
      : config.instructions;

  return new voice.Agent({ instructions, tools });
}
```

- [ ] **Step 4.2: Update agent.test.ts**

Replace the contents of `src/features/speech-coach/livekit/__tests__/agent.test.ts`:

```typescript
import { describe, expect, it, vi } from "vitest";

// Mock livekit-client Room so tests don't need a real WebRTC environment
vi.mock("livekit-client", () => ({
  Room: class {
    localParticipant = {
      publishData: vi.fn().mockResolvedValue(undefined),
    };
  },
}));

vi.mock("convex/browser", () => ({
  ConvexHttpClient: class {
    action = vi.fn().mockResolvedValue({ ok: true });
  },
}));

import { createSpeechCoachAgent } from "../agent";
import { createSpeechCoachRealtimeModelOptions } from "../entrypoint";
import { SPEECH_COACH_REALTIME_MODEL, SPEECH_COACH_VOICE_MODE } from "../model-config";

const MOCK_DEPS = {
  room: new (await import("livekit-client")).Room() as any,
  sessionId: "session123",
  convexUrl: "https://example.convex.cloud",
  runtimeSecret: "test-secret",
};

describe("createSpeechCoachAgent", () => {
  it("creates an agent with instructions and tools", () => {
    const agent = createSpeechCoachAgent({
      instructions: "Coach a child through articulation practice.",
      ...MOCK_DEPS,
    });
    expect(agent).toBeTruthy();
  });

  it("appends target items to instructions", () => {
    const agent = createSpeechCoachAgent({
      instructions: "Practice these sounds.",
      targetItems: [{ id: "/s/", label: "sun" }],
      ...MOCK_DEPS,
    });
    expect(agent).toBeTruthy(); // agent builds without error
  });
});

describe("createSpeechCoachRealtimeModelOptions", () => {
  it("uses a speaking native-audio model path", () => {
    const options = createSpeechCoachRealtimeModelOptions();
    expect(options).toEqual({ model: SPEECH_COACH_REALTIME_MODEL });
    expect(SPEECH_COACH_VOICE_MODE).toBe("native-audio");
    expect(SPEECH_COACH_REALTIME_MODEL).toContain("native-audio");
  });
});
```

- [ ] **Step 4.3: Run agent tests**

```bash
npx vitest run src/features/speech-coach/livekit/__tests__/agent.test.ts 2>&1 | tail -15
```

Expected: PASS — 3 tests.

- [ ] **Step 4.4: Commit**

```bash
git add src/features/speech-coach/livekit/agent.ts \
        src/features/speech-coach/livekit/__tests__/agent.test.ts
git commit -m "feat(speech-coach): wire agent.ts to use real llm.tool() implementations"
```

---

## Task 5: Update entrypoint.ts to pass room and env vars to agent

**Files:**
- Modify: `src/features/speech-coach/livekit/entrypoint.ts`

- [ ] **Step 5.1: Pass room and env vars when creating the agent**

In `entrypoint.ts`, find the `createSpeechCoachAgent` call inside `entry` and replace it:

```typescript
// Before:
    await session.start({
      room: ctx.room,
      agent: createSpeechCoachAgent({
        instructions:
          metadata.instructions ??
          "You are a helpful speech coach. Guide the child through articulation practice with patience and encouragement.",
        tools: metadata.tools ?? [],
        targetItems: metadata.targetItems,
      }),
    });

// After:
    const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL ?? process.env.CONVEX_URL ?? "";
    const runtimeSecret = process.env.SPEECH_COACH_RUNTIME_SECRET ?? "";

    if (!convexUrl || !runtimeSecret) {
      console.error("[speech-coach] missing CONVEX_URL or SPEECH_COACH_RUNTIME_SECRET — attempt logging disabled");
    }

    await session.start({
      room: ctx.room,
      agent: createSpeechCoachAgent({
        instructions:
          metadata.instructions ??
          "You are a helpful speech coach. Guide the child through articulation practice with patience and encouragement.",
        room: ctx.room,
        sessionId: sessionId ?? "",
        convexUrl,
        runtimeSecret,
        targetItems: metadata.targetItems,
      }),
    });
```

Also remove the duplicate `const convexUrl` / `const runtimeSecret` declarations in the `addShutdownCallback` — they are now declared above. Update the shutdown callback to use the variables from the outer scope:

```typescript
// In addShutdownCallback, replace:
      const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL ?? process.env.CONVEX_URL;
      const runtimeSecret = process.env.SPEECH_COACH_RUNTIME_SECRET;
      if (!convexUrl || !runtimeSecret) {
        throw new Error("Speech coach transcript persistence env vars are missing");
      }

// With (variables already in scope):
      if (!convexUrl || !runtimeSecret) {
        console.error("[speech-coach] missing env vars — cannot persist transcript");
        return;
      }
```

- [ ] **Step 5.2: Commit**

```bash
git add src/features/speech-coach/livekit/entrypoint.ts
git commit -m "feat(speech-coach): pass room and env vars to agent for real-time tool calls"
```

---

## Task 6: Clinical protocol prompt + skill injection in buildSpeechCoachRuntimeInstructions

**Files:**
- Modify: `src/features/speech-coach/lib/runtime-config.ts`
- Modify: `src/features/speech-coach/lib/__tests__/runtime-config.test.ts`

- [ ] **Step 6.1: Write failing tests**

Add to `src/features/speech-coach/lib/__tests__/runtime-config.test.ts`:

```typescript
describe("clinical protocol prompt", () => {
  it("includes the cueing hierarchy in all instructions", () => {
    const resolved = resolveSpeechCoachRuntimeConfig({
      template: { name: "T", voice: { provider: "elevenlabs", voiceKey: "k" } },
      childOverrides: { targetSounds: ["/s/"] },
    });
    const instructions = buildSpeechCoachRuntimeInstructions({ resolvedConfig: resolved });
    expect(instructions).toContain("CUEING HIERARCHY");
    expect(instructions).toContain("Elicit spontaneously");
  });

  it("includes wait time guidance for autism", () => {
    const resolved = resolveSpeechCoachRuntimeConfig({
      template: { name: "T", voice: { provider: "elevenlabs", voiceKey: "k" } },
      childOverrides: { targetSounds: ["/s/"] },
    });
    const instructions = buildSpeechCoachRuntimeInstructions({ resolvedConfig: resolved });
    expect(instructions).toContain("5-10");
  });

  it("injects enabled skill clinical modules", () => {
    const resolved = resolveSpeechCoachRuntimeConfig({
      template: {
        name: "T",
        voice: { provider: "elevenlabs", voiceKey: "k" },
        skills: [
          { key: "auditory-bombardment", enabled: true },
          { key: "carryover-conversation", enabled: false },
        ],
      },
      childOverrides: { targetSounds: ["/s/"] },
    });
    const instructions = buildSpeechCoachRuntimeInstructions({ resolvedConfig: resolved });
    expect(instructions).toContain("5-8 times");          // auditory-bombardment text
    expect(instructions).not.toContain("Embed target words naturally in simple conversation"); // disabled skill
  });

  it("includes tool call instructions", () => {
    const resolved = resolveSpeechCoachRuntimeConfig({
      template: { name: "T", voice: { provider: "elevenlabs", voiceKey: "k" } },
      childOverrides: { targetSounds: ["/s/"] },
    });
    const instructions = buildSpeechCoachRuntimeInstructions({ resolvedConfig: resolved });
    expect(instructions).toContain("signal_state");
    expect(instructions).toContain("log_attempt");
  });
});
```

- [ ] **Step 6.2: Run tests to verify they fail**

```bash
npx vitest run src/features/speech-coach/lib/__tests__/runtime-config.test.ts 2>&1 | tail -15
```

Expected: FAIL — cueing hierarchy, wait time, skill modules, tool instructions not present.

- [ ] **Step 6.3: Replace buildSpeechCoachRuntimeInstructions in runtime-config.ts**

Replace the existing `BASE_RUNTIME_RULES` constant and `buildSpeechCoachRuntimeInstructions` function with:

```typescript
const CLINICAL_PROTOCOL_BASE = `You are Vocali Speech Coach, an AI speech practice partner for children. You are warm, patient, and concrete. You never diagnose, evaluate, or give medical advice.

COMMUNICATION RULES (always follow, especially for children with autism):
- Use short sentences: 5-7 words max for ages 2-5, 8-10 words for ages 6+
- Wait 5-10 full seconds after asking before repeating — do not fill silence
- Never ask open-ended questions without a model first
- Predictable turn-taking: you speak → you wait → child responds
- Praise the attempt, not just the outcome: say "Good trying!" not just "Wrong"
- One instruction at a time — never chain two requests

CUEING HIERARCHY (follow in order, do not skip levels):
1. Elicit spontaneously: "Can you say [word]?"
2. Model: "Listen — [word]. Now you try."
3. Phonetic cue: describe where the sound is made briefly
4. Move on warmly: "That one is tricky — let's try [next word]"

PACING:
- After each correct attempt: brief praise, then next target immediately
- After incorrect: one retry maximum using the next cue level, then move on
- If child goes silent: wait 7 seconds → offer a choice → offer a 30-second break topic`;

const SKILL_MODULES: Record<string, string> = {
  "auditory-bombardment":
    "AUDITORY BOMBARDMENT: Repeat each target word 5-8 times naturally in simple sentences before asking the child to say it. Embed targets: 'Look, a sun! The sun is yellow. That sun is bright. Can you say sun?'",
  "model-then-imitate":
    "MODEL THEN IMITATE: Always model the target word first. Say it clearly, pause 3 seconds in silence, then ask the child to repeat. Never ask without modeling first.",
  "recast-and-retry":
    "RECAST AND RETRY: When the child produces a close approximation, recast it correctly with warm affirmation ('Yes! Sun!') and move forward. Only retry once per word.",
  "choice-based-elicitation":
    "CHOICE-BASED ELICITATION: Instead of asking for spontaneous production, offer two choices: 'Is this a sun or a moon?' This reduces demand and increases successful responses.",
  "carryover-conversation":
    "CARRYOVER CONVERSATION: Embed target words naturally in simple conversation about the child's interests. Do not drill — use targets as they arise organically in topic talk.",
  "low-frustration-fallback":
    "LOW FRUSTRATION FALLBACK: At the first sign of resistance (silence, redirection, off-topic talk), immediately back off. Offer a brief break topic ('Want to talk about trains for a sec?'), then return gently.",
};

const TOOL_CALL_INSTRUCTIONS = `TOOLS YOU MUST USE DURING EVERY SESSION:
- Call signal_state at the start of each new target word and after each prompt phase change
- Call log_attempt immediately after every child response (correct, approximate, incorrect, or no_response)
- Call advance_target before introducing a new word so the child's screen updates
Do not skip these calls — they power the visual display the child sees and the post-session report the parent reads.`;

export function buildSpeechCoachRuntimeInstructions(args: {
  resolvedConfig: ResolvedSpeechCoachRuntimeConfig;
  sessionGuidance?: string | null;
}) {
  const { resolvedConfig, sessionGuidance } = args;

  // Inject only the enabled skill modules
  const enabledSkillModules = resolvedConfig.skills
    .filter((s) => s.enabled && SKILL_MODULES[s.key])
    .map((s) => SKILL_MODULES[s.key]);

  const blocks = [
    CLINICAL_PROTOCOL_BASE,
    ...enabledSkillModules,
    TOOL_CALL_INSTRUCTIONS,
    resolvedConfig.prompt.baseExtension,
    resolvedConfig.prompt.coachingStyle,
    resolvedConfig.prompt.toolInstructions,
    resolvedConfig.prompt.knowledgeInstructions,
    resolvedConfig.prompt.childAddendum,
    resolvedConfig.knowledge.snippets.length > 0
      ? `Knowledge snippets: ${resolvedConfig.knowledge.snippets.join(" ")}`
      : "",
    sessionGuidance ?? "",
  ].filter(Boolean);

  return blocks.join("\n\n");
}
```

- [ ] **Step 6.4: Run tests to verify they pass**

```bash
npx vitest run src/features/speech-coach/lib/__tests__/runtime-config.test.ts 2>&1 | tail -15
```

Expected: PASS — all existing tests + 4 new ones.

- [ ] **Step 6.5: Commit**

```bash
git add src/features/speech-coach/lib/runtime-config.ts \
        src/features/speech-coach/lib/__tests__/runtime-config.test.ts
git commit -m "feat(speech-coach): replace generic base prompt with clinical protocol + skill injection"
```

---

## Task 7: Age-appropriate language tier in session guidance

**Files:**
- Modify: `src/features/speech-coach/lib/session-guidance.ts`
- Modify: `src/features/speech-coach/lib/__tests__/session-guidance.test.ts`

- [ ] **Step 7.1: Write the failing test**

Add to `src/features/speech-coach/lib/__tests__/session-guidance.test.ts`:

```typescript
describe("age-appropriate language tier", () => {
  it("includes early childhood tier for ages 2-5", () => {
    const guidance = buildSessionGuidance(
      { targetSounds: ["/s/"], ageRange: "2-4", durationMinutes: 5 },
      { targetSounds: ["/s/"], ageRange: "2-4", defaultDurationMinutes: 5, childAge: 3 }
    );
    expect(guidance).toContain("1-2 word models");
  });

  it("includes school-age tier for ages 8+", () => {
    const guidance = buildSessionGuidance(
      { targetSounds: ["/s/"], ageRange: "5-7", durationMinutes: 10 },
      { targetSounds: ["/s/"], ageRange: "5-7", defaultDurationMinutes: 10, childAge: 9 }
    );
    expect(guidance).toContain("capable partner");
  });
});
```

- [ ] **Step 7.2: Run to verify failure**

```bash
npx vitest run src/features/speech-coach/lib/__tests__/session-guidance.test.ts 2>&1 | tail -10
```

Expected: FAIL.

- [ ] **Step 7.3: Add language tier lines to buildSessionGuidance**

In `src/features/speech-coach/lib/session-guidance.ts`, add the tier block after the age line. Insert before `lines.push(...)` for focusArea:

```typescript
  // Age-appropriate language tier
  const age = speechCoachConfig?.childAge;
  if (age !== undefined) {
    if (age <= 4) {
      lines.push("Language tier (ages 2-4): Use 1-2 word models. Lots of repetition. Songs and silly sounds are welcome.");
    } else if (age <= 7) {
      lines.push("Language tier (ages 5-7): Simple sentences. Playful but structured. Minimal explanation.");
    } else {
      lines.push(`Language tier (ages 8+): Child is ${age} years old. Can handle brief explanation of why we practice sounds. Treat as a capable partner.`);
    }
  }
```

- [ ] **Step 7.4: Run tests to verify they pass**

```bash
npx vitest run src/features/speech-coach/lib/__tests__/session-guidance.test.ts 2>&1 | tail -10
```

Expected: PASS — all tests.

- [ ] **Step 7.5: Commit**

```bash
git add src/features/speech-coach/lib/session-guidance.ts \
        src/features/speech-coach/lib/__tests__/session-guidance.test.ts
git commit -m "feat(speech-coach): add age-appropriate language tier to session guidance"
```

---

## Task 8: PromptStateCard component

**Files:**
- Create: `src/features/speech-coach/components/prompt-state-card.tsx`
- Create: `src/features/speech-coach/components/__tests__/prompt-state-card.test.tsx`

- [ ] **Step 8.1: Write the failing test**

Create `src/features/speech-coach/components/__tests__/prompt-state-card.test.tsx`:

```typescript
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PromptStateCard } from "../prompt-state-card";

describe("PromptStateCard", () => {
  it("renders the listen state by default", () => {
    render(<PromptStateCard state="listen" reducedMotion={false} />);
    expect(screen.getByText("Listen carefully")).toBeInTheDocument();
  });

  it("renders your_turn state", () => {
    render(<PromptStateCard state="your_turn" reducedMotion={false} />);
    expect(screen.getByText("Your turn!")).toBeInTheDocument();
  });

  it("renders try_again state", () => {
    render(<PromptStateCard state="try_again" reducedMotion={false} />);
    expect(screen.getByText("Try again")).toBeInTheDocument();
  });

  it("renders nice_job state", () => {
    render(<PromptStateCard state="nice_job" reducedMotion={false} />);
    expect(screen.getByText("Nice job!")).toBeInTheDocument();
  });

  it("does not apply transition class when reducedMotion is true", () => {
    const { container } = render(<PromptStateCard state="listen" reducedMotion={true} />);
    expect(container.firstChild).not.toHaveClass("transition-colors");
  });
});
```

- [ ] **Step 8.2: Run to verify failure**

```bash
npx vitest run src/features/speech-coach/components/__tests__/prompt-state-card.test.tsx 2>&1 | tail -10
```

Expected: FAIL — module not found.

- [ ] **Step 8.3: Create PromptStateCard**

Create `src/features/speech-coach/components/prompt-state-card.tsx`:

```typescript
import { cn } from "@/core/utils";

type PromptState = "listen" | "your_turn" | "try_again" | "nice_job";

const STATE_CONFIG: Record<
  PromptState,
  { emoji: string; label: string; bg: string; text: string }
> = {
  listen: {
    emoji: "👂",
    label: "Listen carefully",
    bg: "bg-info-container",
    text: "text-on-info-container",
  },
  your_turn: {
    emoji: "⭐",
    label: "Your turn!",
    bg: "bg-primary/10",
    text: "text-primary",
  },
  try_again: {
    emoji: "🤚",
    label: "Try again",
    bg: "bg-caution-container",
    text: "text-on-caution-container",
  },
  nice_job: {
    emoji: "✓",
    label: "Nice job!",
    bg: "bg-success-container",
    text: "text-on-success-container",
  },
};

type Props = {
  state: PromptState;
  reducedMotion: boolean;
};

export function PromptStateCard({ state, reducedMotion }: Props) {
  const config = STATE_CONFIG[state];
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-2xl px-6 py-4",
        config.bg,
        config.text,
        !reducedMotion && "transition-colors duration-300"
      )}
    >
      <span className="text-2xl" aria-hidden="true">
        {config.emoji}
      </span>
      <span className="font-headline text-xl font-semibold">{config.label}</span>
    </div>
  );
}
```

- [ ] **Step 8.4: Run tests to verify they pass**

```bash
npx vitest run src/features/speech-coach/components/__tests__/prompt-state-card.test.tsx 2>&1 | tail -10
```

Expected: PASS — 5 tests.

- [ ] **Step 8.5: Commit**

```bash
git add src/features/speech-coach/components/prompt-state-card.tsx \
        src/features/speech-coach/components/__tests__/prompt-state-card.test.tsx
git commit -m "feat(speech-coach): add PromptStateCard with 4 states and reducedMotion support"
```

---

## Task 9: CaregiverGuidanceStrip component

**Files:**
- Create: `src/features/speech-coach/components/caregiver-guidance-strip.tsx`
- Create: `src/features/speech-coach/components/__tests__/caregiver-guidance-strip.test.tsx`

- [ ] **Step 9.1: Write the failing test**

Create `src/features/speech-coach/components/__tests__/caregiver-guidance-strip.test.tsx`:

```typescript
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { CaregiverGuidanceStrip } from "../caregiver-guidance-strip";

describe("CaregiverGuidanceStrip", () => {
  it("shows the onboarding tip during the first 60 seconds (elapsedMs < 60000)", () => {
    render(
      <CaregiverGuidanceStrip
        elapsedMs={15_000}
        durationMs={300_000}
        onDismiss={vi.fn()}
      />
    );
    expect(screen.getByText(/coach has this/i)).toBeInTheDocument();
  });

  it("shows the almost-done tip when within last 60 seconds", () => {
    render(
      <CaregiverGuidanceStrip
        elapsedMs={250_000}
        durationMs={300_000}
        onDismiss={vi.fn()}
      />
    );
    expect(screen.getByText(/almost done/i)).toBeInTheDocument();
  });

  it("shows the mid-session tip between first and last 60 seconds", () => {
    render(
      <CaregiverGuidanceStrip
        elapsedMs={120_000}
        durationMs={300_000}
        onDismiss={vi.fn()}
      />
    );
    expect(screen.getByText(/thumbs up/i)).toBeInTheDocument();
  });

  it("calls onDismiss when the hide button is clicked", () => {
    const onDismiss = vi.fn();
    render(
      <CaregiverGuidanceStrip
        elapsedMs={30_000}
        durationMs={300_000}
        onDismiss={onDismiss}
      />
    );
    fireEvent.click(screen.getByText(/hide/i));
    expect(onDismiss).toHaveBeenCalledOnce();
  });
});
```

- [ ] **Step 9.2: Run to verify failure**

```bash
npx vitest run src/features/speech-coach/components/__tests__/caregiver-guidance-strip.test.tsx 2>&1 | tail -10
```

Expected: FAIL — module not found.

- [ ] **Step 9.3: Create CaregiverGuidanceStrip**

Create `src/features/speech-coach/components/caregiver-guidance-strip.tsx`:

```typescript
type Props = {
  elapsedMs: number;
  durationMs: number;
  onDismiss: () => void;
};

function getTip(elapsedMs: number, durationMs: number): string {
  const remainingMs = durationMs - elapsedMs;
  if (elapsedMs < 60_000) {
    return "The coach has this — just smile and wait. No need to prompt.";
  }
  if (remainingMs < 60_000) {
    return "Almost done — great job today! Just a little longer.";
  }
  return "A thumbs up goes a long way. Keep cheering them on!";
}

export function CaregiverGuidanceStrip({ elapsedMs, durationMs, onDismiss }: Props) {
  const tip = getTip(elapsedMs, durationMs);
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl bg-surface-container px-4 py-3 text-sm">
      <p className="text-on-surface-variant">{tip}</p>
      <button
        type="button"
        onClick={onDismiss}
        className="shrink-0 text-xs font-medium text-primary underline"
      >
        Hide
      </button>
    </div>
  );
}
```

- [ ] **Step 9.4: Run tests to verify they pass**

```bash
npx vitest run src/features/speech-coach/components/__tests__/caregiver-guidance-strip.test.tsx 2>&1 | tail -10
```

Expected: PASS — 4 tests.

- [ ] **Step 9.5: Commit**

```bash
git add src/features/speech-coach/components/caregiver-guidance-strip.tsx \
        src/features/speech-coach/components/__tests__/caregiver-guidance-strip.test.tsx
git commit -m "feat(speech-coach): add CaregiverGuidanceStrip with phase-aware tips"
```

---

## Task 10: Update active-session.tsx — data channel, visual state, UI

**Files:**
- Modify: `src/features/speech-coach/components/active-session.tsx`
- Modify: `src/features/speech-coach/components/__tests__/active-session.test.tsx`

- [ ] **Step 10.1: Write new failing tests**

Add to `src/features/speech-coach/components/__tests__/active-session.test.tsx`:

```typescript
// Add to existing mocks:
vi.mock("@livekit/components-react", () => ({
  LiveKitRoom: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  RoomAudioRenderer: () => null,
  useRoomContext: () => ({
    on: vi.fn(),
    off: vi.fn(),
  }),
}));

// Add new test:
describe("active session UI elements", () => {
  it("renders the 5-dot progress row", () => {
    render(
      <ActiveSession
        runtimeSession={{ runtime: "livekit-agent", roomName: "r", serverUrl: "wss://x", tokenPath: "/t" }}
        onConversationStarted={() => undefined}
        onEnd={() => undefined}
        durationMinutes={10}
        sessionConfig={{ targetSounds: ["/s/"], ageRange: "2-4", durationMinutes: 10 }}
        speechCoachConfig={undefined}
      />
    );
    // 5 progress dots rendered as aria-hidden spans
    const dots = document.querySelectorAll('[data-testid="progress-dot"]');
    expect(dots.length).toBe(5);
  });

  it("renders the PromptStateCard with default listen state", () => {
    render(
      <ActiveSession
        runtimeSession={{ runtime: "livekit-agent", roomName: "r", serverUrl: "wss://x", tokenPath: "/t" }}
        onConversationStarted={() => undefined}
        onEnd={() => undefined}
        durationMinutes={5}
        sessionConfig={{ targetSounds: ["/s/"], ageRange: "2-4", durationMinutes: 5 }}
        speechCoachConfig={undefined}
      />
    );
    expect(screen.getByText("Listen carefully")).toBeInTheDocument();
  });
});
```

- [ ] **Step 10.2: Run to verify failure**

```bash
npx vitest run src/features/speech-coach/components/__tests__/active-session.test.tsx 2>&1 | tail -15
```

Expected: FAIL — useRoomContext mock missing, progress dots not found.

- [ ] **Step 10.3: Replace ActiveSession implementation**

Replace the full contents of `src/features/speech-coach/components/active-session.tsx`:

```typescript
"use client";

import { LiveKitRoom, RoomAudioRenderer, useRoomContext } from "@livekit/components-react";
import Image from "next/image";
import { RoomEvent } from "livekit-client";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { cn } from "@/core/utils";
import { Button } from "@/shared/components/ui/button";

import type { SpeechCoachConfig } from "../lib/config";
import type { AgentVisualMessage } from "../livekit/tools";
import { CaregiverGuidanceStrip } from "./caregiver-guidance-strip";
import { PromptStateCard } from "./prompt-state-card";

type SessionConfig = {
  targetSounds: string[];
  ageRange: "2-4" | "5-7";
  durationMinutes: number;
  focusArea?: string;
};

type LiveKitRuntimeSession = {
  runtime: "livekit-agent";
  serverUrl: string;
  tokenPath: string;
  roomName: string;
  roomMetadata?: string;
};

type Props = {
  runtimeSession: LiveKitRuntimeSession;
  onConversationStarted: (conversationId: string) => void;
  onEnd: () => void;
  durationMinutes: number;
  sessionConfig?: SessionConfig;
  speechCoachConfig?: SpeechCoachConfig;
};

export type SessionVisualState = {
  targetLabel: string;
  targetVisualUrl?: string;
  promptState: "listen" | "your_turn" | "try_again" | "nice_job";
  totalCorrect: number;
};

export function getCelebrationMode({ totalCorrect }: { totalCorrect: number }) {
  return totalCorrect > 0 && totalCorrect % 5 === 0 ? "milestone" : "check";
}

/** Receives data channel messages from the LiveKit agent and fires onMessage. Must be inside LiveKitRoom. */
function AgentDataListener({ onMessage }: { onMessage: (msg: AgentVisualMessage) => void }) {
  const room = useRoomContext();
  useEffect(() => {
    function handleData(payload: Uint8Array) {
      try {
        const msg = JSON.parse(new TextDecoder().decode(payload)) as AgentVisualMessage;
        onMessage(msg);
      } catch {
        // Ignore malformed data
      }
    }
    room.on(RoomEvent.DataReceived, handleData);
    return () => { room.off(RoomEvent.DataReceived, handleData); };
  }, [room, onMessage]);
  return null;
}

export function ActiveSession(props: Props) {
  return <ActiveSessionInner {...props} />;
}

function ActiveSessionInner({
  runtimeSession,
  onConversationStarted,
  onEnd,
  durationMinutes,
  sessionConfig,
  speechCoachConfig,
}: Props) {
  const wasConnected = useRef(false);
  const hasStarted = useRef(false);
  const sessionStartTime = useRef<number | null>(null);

  const [token, setToken] = useState<string | null>(null);
  const [serverUrl, setServerUrl] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [showGuidance, setShowGuidance] = useState(true);
  const [elapsedMs, setElapsedMs] = useState(0);

  const reducedMotion = speechCoachConfig?.reducedMotion ?? false;

  const [visual, setVisual] = useState<SessionVisualState>({
    targetLabel: sessionConfig?.targetSounds?.[0] ?? "Practice sound",
    promptState: "listen",
    totalCorrect: 0,
  });

  const handleAgentMessage = useCallback((msg: AgentVisualMessage) => {
    if (msg.type === "visual_state") {
      setVisual({
        targetLabel: msg.targetLabel,
        targetVisualUrl: msg.targetImageUrl,
        promptState: msg.promptState,
        totalCorrect: msg.totalCorrect,
      });
    } else if (msg.type === "advance_target") {
      setVisual((prev) => ({ ...prev, targetLabel: msg.nextLabel, promptState: "listen" }));
    }
  }, []);

  // Tick elapsed time every second while connected (for caregiver guidance strip)
  useEffect(() => {
    if (!isConnected) return;
    const id = setInterval(() => {
      if (sessionStartTime.current) {
        setElapsedMs(Date.now() - sessionStartTime.current);
      }
    }, 1000);
    return () => clearInterval(id);
  }, [isConnected]);

  // Fetch LiveKit token
  useEffect(() => {
    if (hasStarted.current) return;
    hasStarted.current = true;

    fetch(runtimeSession.tokenPath, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        roomName: runtimeSession.roomName,
        participantName: "participant",
        roomMetadata: runtimeSession.roomMetadata,
      }),
    })
      .then((res) => {
        if (!res.ok) throw new Error(`${res.status}`);
        return res.json() as Promise<{ token: string; serverUrl: string }>;
      })
      .then(({ token, serverUrl }) => { setToken(token); setServerUrl(serverUrl); })
      .catch(() => setFetchError(true));
  }, [runtimeSession.roomMetadata, runtimeSession.roomName, runtimeSession.tokenPath]);

  // Connection timeout
  useEffect(() => {
    if (fetchError) {
      toast.error("Couldn't reach speech coach", { description: "Check your internet connection and try again." });
      onEnd();
      return;
    }
    const timeout = setTimeout(() => {
      if (!wasConnected.current) {
        toast.error("Couldn't reach speech coach", { description: "Check your internet connection and try again." });
        onEnd();
      }
    }, 15_000);
    return () => clearTimeout(timeout);
  }, [fetchError, onEnd]);

  // Auto-stop after session duration
  useEffect(() => {
    const timeout = setTimeout(() => onEnd(), durationMinutes * 60 * 1000);
    return () => clearTimeout(timeout);
  }, [durationMinutes, onEnd]);

  const handleStop = useCallback(() => { onEnd(); }, [onEnd]);

  const isMilestone = getCelebrationMode({ totalCorrect: visual.totalCorrect }) === "milestone";
  const attemptDotsFilled = visual.totalCorrect % 5;

  return (
    <div className="relative flex h-full flex-col items-center justify-center gap-6 p-6">
      {/* LiveKit room — invisible in DOM, provides audio */}
      {token && serverUrl && (
        <LiveKitRoom
          token={token}
          serverUrl={serverUrl}
          connect={true}
          audio={true}
          video={false}
          onConnected={() => {
            wasConnected.current = true;
            sessionStartTime.current = Date.now();
            setIsConnected(true);
            onConversationStarted(runtimeSession.roomName);
          }}
          onDisconnected={() => { if (wasConnected.current) onEnd(); }}
        >
          <RoomAudioRenderer />
          <AgentDataListener onMessage={handleAgentMessage} />
        </LiveKitRoom>
      )}

      {/* Milestone confetti overlay — CSS only, skipped when reducedMotion */}
      {isMilestone && !reducedMotion && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-10 animate-confetti-burst"
        />
      )}

      {/* Target card */}
      <div className="mx-auto flex w-full max-w-md flex-col items-center gap-4">
        {/* 5-dot progress row */}
        <div className="flex gap-2" aria-label={`${attemptDotsFilled} of 5 attempts`}>
          {Array.from({ length: 5 }).map((_, i) => (
            <span
              key={i}
              data-testid="progress-dot"
              aria-hidden="true"
              className={cn(
                "h-3 w-3 rounded-full",
                !reducedMotion && "transition-colors duration-300",
                i < attemptDotsFilled ? "bg-primary" : "bg-muted"
              )}
            />
          ))}
        </div>

        {/* Target image and label */}
        <div className="w-full rounded-3xl bg-background p-6 shadow-sm">
          <div className="flex flex-col items-center gap-4">
            <div
              className={cn(
                "flex h-48 w-48 items-center justify-center overflow-hidden rounded-3xl bg-muted/40",
                !reducedMotion && "transition-opacity duration-300",
                isConnected ? "opacity-100" : "opacity-50"
              )}
            >
              {visual.targetVisualUrl ? (
                <Image
                  src={visual.targetVisualUrl}
                  alt={visual.targetLabel}
                  width={192}
                  height={192}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="font-headline text-5xl text-foreground">{visual.targetLabel}</span>
              )}
            </div>
            <p className="font-headline text-3xl text-foreground">{visual.targetLabel}</p>
            {!isConnected && (
              <p className="text-xs text-muted-foreground/60">Connecting…</p>
            )}
          </div>
        </div>

        {/* Prompt state card */}
        <PromptStateCard state={visual.promptState} reducedMotion={reducedMotion} />
      </div>

      {/* Caregiver guidance strip */}
      {showGuidance && (
        <div className="w-full max-w-md">
          <CaregiverGuidanceStrip
            elapsedMs={elapsedMs}
            durationMs={durationMinutes * 60 * 1000}
            onDismiss={() => setShowGuidance(false)}
          />
        </div>
      )}

      <Button onClick={handleStop} variant="outline" size="lg">
        Stop Session
      </Button>
    </div>
  );
}
```

- [ ] **Step 10.4: Add confetti animation to globals.css**

In `src/app/globals.css`, inside the `@layer utilities` block (or add one), add:

```css
@layer utilities {
  @keyframes confetti-burst {
    0% { background: radial-gradient(circle, oklch(80% 0.15 145) 0%, transparent 70%); opacity: 1; }
    100% { background: radial-gradient(circle, oklch(80% 0.15 145) 0%, transparent 70%); opacity: 0; }
  }
  .animate-confetti-burst {
    animation: confetti-burst 1.5s cubic-bezier(0.4, 0, 0.2, 1) forwards;
  }
}
```

- [ ] **Step 10.5: Run active-session tests**

```bash
npx vitest run src/features/speech-coach/components/__tests__/active-session.test.tsx 2>&1 | tail -15
```

Expected: PASS — all tests including original connect test and 2 new tests.

- [ ] **Step 10.6: Commit**

```bash
git add src/features/speech-coach/components/active-session.tsx \
        src/features/speech-coach/components/__tests__/active-session.test.tsx \
        src/app/globals.css
git commit -m "feat(speech-coach): wire data channel to visual state, add PromptStateCard, progress dots, guidance strip"
```

---

## Task 11: SessionConfig — add 8 and 15 min duration options

**Files:**
- Modify: `src/features/speech-coach/components/session-config.tsx`
- Modify: `src/features/speech-coach/components/__tests__/session-config.test.tsx`

- [ ] **Step 11.1: Write the failing test**

Add to `src/features/speech-coach/components/__tests__/session-config.test.tsx`:

```typescript
  it("offers 4 duration options including 8 and 15 minutes", () => {
    render(<SessionConfig speechCoachConfig={DEFAULT_CONFIG} onStart={vi.fn()} />);
    expect(screen.getByLabelText("8 minutes")).toBeInTheDocument();
    expect(screen.getByLabelText("15 minutes")).toBeInTheDocument();
  });
```

- [ ] **Step 11.2: Run to verify failure**

```bash
npx vitest run src/features/speech-coach/components/__tests__/session-config.test.tsx 2>&1 | tail -10
```

Expected: FAIL — 8 and 15 minute options not found.

- [ ] **Step 11.3: Update duration options in session-config.tsx**

In `src/features/speech-coach/components/session-config.tsx`, replace the duration state and options:

```typescript
// Replace:
  const [duration, setDuration] = useState<5 | 10>(
    speechCoachConfig.defaultDurationMinutes <= 5 ? 5 : 10
  );

// With:
  const [duration, setDuration] = useState<5 | 8 | 10 | 15>(() => {
    const d = speechCoachConfig.defaultDurationMinutes;
    if (d <= 5) return 5;
    if (d <= 8) return 8;
    if (d <= 10) return 10;
    return 15;
  });
```

Replace the duration options map:

```typescript
// Replace:
          {([5, 10] as const).map((mins) => (

// With:
          {([5, 8, 10, 15] as const).map((mins) => (
```

In the `label` element inside the map, update the `aria-label` to be accessible:

```typescript
            <label
              key={mins}
              aria-label={`${mins} minutes`}
              className={cn(
```

Also update the `handleStart` call — `duration` type is now `5 | 8 | 10 | 15`, which is compatible with the existing `durationMinutes: number` in `SessionConfigData`. No other changes needed.

- [ ] **Step 11.4: Run tests to verify they pass**

```bash
npx vitest run src/features/speech-coach/components/__tests__/session-config.test.tsx 2>&1 | tail -10
```

Expected: PASS — all tests including new one.

- [ ] **Step 11.5: Commit**

```bash
git add src/features/speech-coach/components/session-config.tsx \
        src/features/speech-coach/components/__tests__/session-config.test.tsx
git commit -m "feat(speech-coach): add 8 and 15 minute session duration options"
```

---

## Task 12: Full suite verification

- [ ] **Step 12.1: Run the full test suite**

```bash
npm test 2>&1 | tail -30
```

Expected: all existing tests still pass + 20+ new tests across Tasks 2–11. Zero regressions.

- [ ] **Step 12.2: TypeScript check**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors.

- [ ] **Step 12.3: Convex types check**

```bash
npx convex dev --once 2>&1 | tail -10
```

Expected: exits 0.

---

## Self-Review Checklist

- [x] rawAttempts schema + logAttempt internalMutation (Task 1–2)
- [x] logAttemptFromRuntime action validates runtime secret before writing (Task 2) — HIPAA gate
- [x] Tools use llm.tool() with Zod schemas — exact LiveKit agents Node.js API (Task 3)
- [x] signal_state uses fire-and-forget publishData — does not block agent audio pipeline (Task 3)
- [x] log_attempt catches and warns on Convex failure — doesn't crash session (Task 3)
- [x] agent.ts receives room reference via constructor — no reliance on uncertain ctx.session.room (Task 4)
- [x] entrypoint.ts env vars read once and reused across both agent tools and shutdown callback (Task 5)
- [x] CLINICAL_PROTOCOL_BASE includes wait time, cueing hierarchy, autism-specific communication rules (Task 6)
- [x] Skill injection only includes enabled skills (Task 6)
- [x] TOOL_CALL_INSTRUCTIONS appended to every session prompt (Task 6)
- [x] Age language tiers cover 3 bands: 2-4, 5-7, 8+ (Task 7)
- [x] AgentDataListener is inside LiveKitRoom — useRoomContext requires the provider (Task 10)
- [x] Confetti animation skipped when reducedMotion is true (Task 10)
- [x] Progress dots use data-testid for testability (Task 10)
- [x] reducedMotion sourced from speechCoachConfig.reducedMotion with safe fallback to false (Task 10)
- [x] Duration options now 5/8/10/15 — use union type not number to keep exhaustive (Task 11)
