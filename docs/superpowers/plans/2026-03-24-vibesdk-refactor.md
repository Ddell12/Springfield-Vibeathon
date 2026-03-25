# VibeSDK-Inspired Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Bridges' config-based therapy tool generation with full code generation using Anthropic SDK, a phasic state machine in Convex, therapy-structured blueprints, dynamic E2B templates, and Convex-based version history.

**Architecture:** Pipeline orchestration runs in Convex `internalAction`s with `"use node;"` and `@anthropic-ai/sdk`. API routes are thin entry points. Convex scheduler chains pipeline steps. Frontend subscribes to Convex queries for real-time progress. E2B sandbox gets multi-file writes with dynamic template selection.

**Tech Stack:** Convex (backend + pipeline), `@anthropic-ai/sdk` (LLM), E2B (sandbox), Next.js App Router (frontend), shadcn/ui + Tailwind v4 (UI), Zod v4 (schemas)

**Spec:** `docs/superpowers/specs/2026-03-24-vibesdk-refactor-design.md`

---

## File Map

### Convex Backend (New)
| File | Responsibility |
|------|---------------|
| `convex/schema.ts` | Modified — add sessions, messages, agentContext, blueprints, phases, files, versions tables; rename tools→apps, toolState→appState; remove projects |
| `convex/sessions.ts` | Session CRUD + state machine mutations + scheduler chaining |
| `convex/messages.ts` | Conversation message CRUD per session |
| `convex/agent_context.ts` | Agent LLM conversation context persistence + compaction |
| `convex/blueprints.ts` | Blueprint CRUD + approval mutation |
| `convex/phases.ts` | Phase tracking CRUD |
| `convex/generated_files.ts` | Generated file CRUD per session |
| `convex/versions.ts` | Version snapshot history with diffs |
| `convex/apps.ts` | Renamed from tools.ts — published apps CRUD |
| `convex/app_state.ts` | Renamed from tool_state.ts — key-value state per app |
| `convex/pipeline.ts` | `"use node";` — main pipeline dispatcher + per-state step handlers |
| `convex/pipeline_tools.ts` | Anthropic tool definitions + executeToolCall handler |
| `convex/pipeline_prompts.ts` | System prompts for blueprint, phase gen, phase impl |
| `convex/e2b.ts` | `"use node";` — E2B sandbox operations (create, write files, run commands, get errors) |

### Frontend (New)
| File | Responsibility |
|------|---------------|
| `src/lib/agent/schemas/index.ts` | Zod schemas: TherapyBlueprintSchema, PhaseConceptSchema, PhaseImplementationSchema |
| `src/app/api/agent/build/route.ts` | Thin entry: create session via Convex mutation |
| `src/app/api/agent/approve/route.ts` | Thin entry: approve blueprint via mutation |
| `src/app/api/agent/message/route.ts` | Thin entry: send follow-up via mutation |
| `src/features/builder/components/builder-page.tsx` | Three-panel layout shell |
| `src/features/builder/components/chat-panel.tsx` | Chat messages + blueprint card + prompt input |
| `src/features/builder/components/code-panel.tsx` | File explorer + syntax-highlighted code viewer |
| `src/features/builder/components/preview-panel.tsx` | E2B iframe + responsive toggle |
| `src/features/builder/components/phase-timeline.tsx` | Horizontal phase progress bar |
| `src/features/builder/components/blueprint-card.tsx` | Structured blueprint approval card |
| `src/features/builder/hooks/use-session.ts` | Convex subscription hooks for session state |
| `src/app/(app)/builder/page.tsx` | Thin page wrapper importing BuilderPage |

### Removed
| File/Dir | Reason |
|----------|--------|
| `convex/agents/` | Replaced by pipeline.ts |
| `convex/chat/` | Replaced by sessions.ts + messages.ts |
| `convex/projects.ts` | Replaced by sessions.ts |
| `src/features/therapy-tools/` | Config-based generation removed |
| `src/app/api/chat/` | Replaced by /api/agent/ routes |
| `src/features/builder-v2/` | Replaced by `src/features/builder/` |

---

## Phase 1: Convex Schema & Backend Foundation

Everything downstream depends on the schema. Build and test this first.

### Task 1: Update Convex Schema

**Files:**
- Modify: `convex/schema.ts`

- [ ] **Step 1: Read current schema**

Read `convex/schema.ts` to understand existing tables: `tools`, `knowledgeBase`, `ttsCache`, `projects`, `toolState`, `therapyTemplates`.

- [ ] **Step 2: Write the new schema**

Replace `convex/schema.ts` with the full new schema. Keep `knowledgeBase`, `ttsCache`, `therapyTemplates` unchanged. Rename `tools`→`apps` and `toolState`→`appState`. Remove `projects`. Add `sessions`, `messages`, `agentContext`, `blueprints`, `phases`, `files`, `versions`.

```typescript
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // ========== NEW: Pipeline tables ==========
  sessions: defineTable({
    userId: v.optional(v.string()),
    title: v.string(),
    query: v.string(),
    state: v.union(
      v.literal("idle"), v.literal("blueprinting"),
      v.literal("template_selecting"), v.literal("phase_generating"),
      v.literal("phase_implementing"), v.literal("deploying"),
      v.literal("validating"), v.literal("finalizing"),
      v.literal("reviewing"), v.literal("complete"),
      v.literal("failed")
    ),
    stateMessage: v.optional(v.string()),
    failureReason: v.optional(v.string()),
    lastGoodState: v.optional(v.string()),
    blueprintId: v.optional(v.id("blueprints")),
    templateName: v.optional(v.string()),
    currentPhaseIndex: v.number(),
    totalPhasesPlanned: v.optional(v.number()),
    phasesRemaining: v.number(),
    sandboxId: v.optional(v.string()),
    previewUrl: v.optional(v.string()),
    publishedUrl: v.optional(v.string()),
    mvpGenerated: v.boolean(),
  }).index("by_user", ["userId"]),

  messages: defineTable({
    sessionId: v.id("sessions"),
    role: v.union(v.literal("user"), v.literal("assistant"), v.literal("system")),
    content: v.string(),
    timestamp: v.number(),
  }).index("by_session", ["sessionId"])
    .index("by_session_timestamp", ["sessionId", "timestamp"]),

  agentContext: defineTable({
    sessionId: v.id("sessions"),
    messages: v.any(),
    tokenCount: v.number(),
  }).index("by_session", ["sessionId"]),

  blueprints: defineTable({
    sessionId: v.id("sessions"),
    blueprint: v.any(),
    markdownPreview: v.string(),
    approved: v.boolean(),
    version: v.number(),
  }).index("by_session", ["sessionId"]),

  phases: defineTable({
    sessionId: v.id("sessions"),
    index: v.number(),
    name: v.string(),
    description: v.string(),
    status: v.union(
      v.literal("pending"), v.literal("generating"),
      v.literal("implementing"), v.literal("deploying"),
      v.literal("validating"), v.literal("completed"), v.literal("failed")
    ),
    concept: v.optional(v.any()),
    files: v.array(v.object({
      path: v.string(),
      purpose: v.string(),
      status: v.union(
        v.literal("pending"), v.literal("generating"),
        v.literal("completed"), v.literal("failed")
      ),
    })),
    installCommands: v.array(v.string()),
    errors: v.optional(v.array(v.string())),
    startedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
  }).index("by_session", ["sessionId"])
    .index("by_session_index", ["sessionId", "index"]),

  files: defineTable({
    sessionId: v.id("sessions"),
    phaseId: v.id("phases"),
    path: v.string(),
    contents: v.string(),
    purpose: v.string(),
    status: v.union(
      v.literal("generated"),
      v.literal("modified"),
      v.literal("deleted")
    ),
  }).index("by_session", ["sessionId"])
    .index("by_session_path", ["sessionId", "path"])
    .index("by_phase", ["phaseId"]),

  versions: defineTable({
    sessionId: v.id("sessions"),
    version: v.number(),
    trigger: v.union(
      v.literal("phase_complete"),
      v.literal("user_edit"),
      v.literal("auto_fix"),
      v.literal("follow_up")
    ),
    triggerMessage: v.optional(v.string()),
    fileRefs: v.array(v.id("files")),
    diff: v.array(v.object({
      path: v.string(),
      action: v.union(v.literal("added"), v.literal("modified"), v.literal("deleted")),
    })),
    phaseIndex: v.optional(v.number()),
    fileCount: v.number(),
    timestamp: v.number(),
  }).index("by_session", ["sessionId"])
    .index("by_session_version", ["sessionId", "version"]),

  // ========== RENAMED: tools → apps ==========
  apps: defineTable({
    title: v.string(),
    description: v.string(),
    sessionId: v.optional(v.id("sessions")),
    shareSlug: v.string(),
    previewUrl: v.optional(v.string()),
    publishedUrl: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_share_slug", ["shareSlug"])
    .index("by_session", ["sessionId"])
    .index("by_created", ["createdAt"]),

  // ========== RENAMED: toolState → appState ==========
  appState: defineTable({
    appId: v.string(),
    key: v.string(),
    value: v.any(),
    updatedAt: v.number(),
  }).index("by_app_key", ["appId", "key"]),

  // ========== KEPT UNCHANGED ==========
  knowledgeBase: defineTable({
    content: v.string(),
    category: v.union(
      v.literal("aba-terminology"),
      v.literal("speech-therapy"),
      v.literal("tool-patterns"),
      v.literal("developmental-milestones"),
      v.literal("iep-goals")
    ),
    title: v.string(),
    embedding: v.array(v.float64()),
  }).vectorIndex("by_embedding", {
    vectorField: "embedding",
    dimensions: 768,
    filterFields: ["category"],
  }),

  ttsCache: defineTable({
    text: v.string(),
    voiceId: v.string(),
    audioUrl: v.string(),
    createdAt: v.number(),
  }).index("by_text_voice", ["text", "voiceId"]),

  therapyTemplates: defineTable({
    name: v.string(),
    description: v.string(),
    category: v.string(),
    starterPrompt: v.string(),
    exampleFragment: v.optional(v.any()),
    sortOrder: v.number(),
  })
    .index("by_category", ["category"])
    .index("by_sortOrder", ["sortOrder"]),
});
```

- [ ] **Step 3: Run `npx convex dev` to verify schema deploys**

Run: `npx convex dev --once`
Expected: Schema deploys without errors. Note: existing data in `tools`, `toolState`, `projects` tables will need migration or manual cleanup (acceptable for big bang).

- [ ] **Step 4: Commit**

```bash
git add convex/schema.ts
git commit -m "feat: replace schema for vibesdk refactor — new pipeline tables, tools→apps rename"
```

---

### Task 2: Sessions CRUD + State Machine

**Files:**
- Create: `convex/sessions.ts`
- Test: `convex/__tests__/sessions.test.ts`

- [ ] **Step 1: Write session tests**

```typescript
// convex/__tests__/sessions.test.ts
import { convexTest } from "convex-test";
import { expect, test, describe } from "vitest";
import schema from "../schema";
import { api, internal } from "../_generated/api";

describe("sessions", () => {
  test("create session with idle state", async () => {
    const t = convexTest(schema);
    const id = await t.mutation(api.sessions.create, {
      title: "Test App",
      query: "Build a token board",
    });
    const session = await t.query(api.sessions.get, { sessionId: id });
    expect(session?.state).toBe("idle");
    expect(session?.phasesRemaining).toBe(8);
    expect(session?.mvpGenerated).toBe(false);
  });

  test("updateState transitions and auto-schedules", async () => {
    const t = convexTest(schema);
    const id = await t.mutation(api.sessions.create, {
      title: "Test", query: "test",
    });
    await t.mutation(internal.sessions.updateState, {
      sessionId: id, state: "phase_generating", stateMessage: "Planning phase 1",
    });
    const session = await t.query(api.sessions.get, { sessionId: id });
    expect(session?.state).toBe("phase_generating");
  });

  test("setFailed captures reason and last good state", async () => {
    const t = convexTest(schema);
    const id = await t.mutation(api.sessions.create, {
      title: "Test", query: "test",
    });
    await t.mutation(internal.sessions.updateState, {
      sessionId: id, state: "phase_implementing", stateMessage: "Generating files",
    });
    await t.mutation(internal.sessions.setFailed, {
      sessionId: id, reason: "LLM timeout",
    });
    const session = await t.query(api.sessions.get, { sessionId: id });
    expect(session?.state).toBe("failed");
    expect(session?.failureReason).toBe("LLM timeout");
    expect(session?.lastGoodState).toBe("phase_implementing");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run convex/__tests__/sessions.test.ts`
Expected: FAIL — `api.sessions` not defined

- [ ] **Step 3: Implement sessions.ts**

```typescript
// convex/sessions.ts
import { v } from "convex/values";
import { mutation, query, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";

export const create = mutation({
  args: {
    title: v.string(),
    query: v.string(),
    userId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const sessionId = await ctx.db.insert("sessions", {
      userId: args.userId,
      title: args.title,
      query: args.query,
      state: "idle",
      currentPhaseIndex: 0,
      phasesRemaining: 8,
      mvpGenerated: false,
    });
    return sessionId;
  },
});

export const get = query({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.sessionId);
  },
});

// Used by pipeline actions via ctx.runQuery
export const getInternal = internalQuery({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.sessionId);
  },
});

const AUTO_ADVANCE_STATES = [
  "template_selecting", "phase_generating", "phase_implementing",
  "deploying", "validating", "finalizing", "reviewing",
];

export const updateState = internalMutation({
  args: {
    sessionId: v.id("sessions"),
    state: v.string(),
    stateMessage: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.sessionId, {
      state: args.state as any,
      stateMessage: args.stateMessage,
    });

    if (AUTO_ADVANCE_STATES.includes(args.state)) {
      await ctx.scheduler.runAfter(0, internal.pipeline.executeStep, {
        sessionId: args.sessionId,
      });
    }
  },
});

// Public mutation — callable from ConvexHTTPClient in API routes
export const startBuild = mutation({
  args: { title: v.string(), query: v.string(), userId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const sessionId = await ctx.db.insert("sessions", {
      userId: args.userId,
      title: args.title,
      query: args.query,
      state: "idle",
      currentPhaseIndex: 0,
      phasesRemaining: 8,
      mvpGenerated: false,
    });
    // Transition to blueprinting + schedule pipeline
    await ctx.db.patch(sessionId, {
      state: "blueprinting",
      stateMessage: "Generating app blueprint...",
    });
    await ctx.scheduler.runAfter(0, internal.pipeline.executeStep, { sessionId });
    return sessionId;
  },
});

// Public mutation — adds follow-up message after completion, recharges counter
export const addFollowUp = mutation({
  args: { sessionId: v.id("sessions"), message: v.string() },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session || session.state !== "complete") return;
    // Add user message
    await ctx.db.insert("messages", {
      sessionId: args.sessionId,
      role: "user",
      content: args.message,
      timestamp: Date.now(),
    });
    // Recharge phase counter to 3 and restart pipeline
    await ctx.db.patch(args.sessionId, {
      state: "phase_generating",
      stateMessage: "Processing follow-up...",
      phasesRemaining: 3,
    });
    await ctx.scheduler.runAfter(0, internal.pipeline.executeStep, { sessionId: args.sessionId });
  },
});

export const setFailed = internalMutation({
  args: {
    sessionId: v.id("sessions"),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) return;
    await ctx.db.patch(args.sessionId, {
      state: "failed",
      failureReason: args.reason,
      lastGoodState: session.state,
    });
  },
});
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run convex/__tests__/sessions.test.ts`
Expected: PASS (note: `internal.pipeline.executeStep` won't exist yet — the scheduler call in updateState will need a stub or the test will need to mock it. Use `convex-test`'s mock capabilities.)

- [ ] **Step 5: Commit**

```bash
git add convex/sessions.ts convex/__tests__/sessions.test.ts
git commit -m "feat: add sessions CRUD with state machine + scheduler chaining"
```

---

### Task 3: Messages, Agent Context, Blueprints, Phases CRUD

**Files:**
- Create: `convex/messages.ts`
- Create: `convex/agent_context.ts`
- Create: `convex/blueprints.ts`
- Create: `convex/phases.ts`
- Create: `convex/generated_files.ts`
- Create: `convex/versions.ts`
- Create: `convex/apps.ts`
- Create: `convex/app_state.ts`
- Test: `convex/__tests__/blueprints.test.ts`

- [ ] **Step 1: Write blueprint approval test**

Test that creating a blueprint and approving it schedules the next pipeline step:

```typescript
// convex/__tests__/blueprints.test.ts
import { convexTest } from "convex-test";
import { expect, test, describe } from "vitest";
import schema from "../schema";
import { api, internal } from "../_generated/api";

describe("blueprints", () => {
  test("create and approve triggers next step", async () => {
    const t = convexTest(schema);
    const sessionId = await t.mutation(api.sessions.create, {
      title: "Test", query: "test",
    });
    const blueprintId = await t.mutation(internal.blueprints.create, {
      sessionId,
      blueprint: { title: "Test App", therapyGoal: "Turn-taking" },
      markdownPreview: "# Test App\nGoal: Turn-taking",
    });
    const bp = await t.query(api.blueprints.getBySession, { sessionId });
    expect(bp?.approved).toBe(false);
    expect(bp?.version).toBe(1);

    await t.mutation(api.blueprints.approve, { sessionId });
    const approved = await t.query(api.blueprints.getBySession, { sessionId });
    expect(approved?.approved).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run convex/__tests__/blueprints.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement all CRUD modules**

Create each file with standard Convex patterns. These are straightforward CRUD — queries, mutations, internalMutations:

**`convex/messages.ts`** — `create` (internalMutation), `list` (query by sessionId, ordered by timestamp), `addUserMessage` (mutation for frontend)

**`convex/agent_context.ts`** — `get` (internalQuery by sessionId), `save` (internalMutation — upsert messages + tokenCount), `compact` (internalMutation — summarize old messages when tokenCount > 100000)

**`convex/blueprints.ts`** — `create` (internalMutation), `getBySession` (query), `approve` (mutation — sets approved=true, updates session state to "template_selecting", schedules pipeline), `requestChanges` (mutation — adds feedback message, re-schedules blueprint step)

**`convex/phases.ts`** — `create` (internalMutation), `list` (query by sessionId), `updateStatus` (internalMutation), `get` (query by sessionId + index)

**`convex/generated_files.ts`** — `upsert` (internalMutation — create or update by sessionId+path), `list` (query by sessionId), `getByPath` (query by sessionId+path), `listByPhase` (query by phaseId)

**`convex/versions.ts`** — `create` (internalMutation), `list` (query by sessionId), `getLatest` (query), `restore` (mutation — copies fileRefs back to files table + redeploys)

**`convex/apps.ts`** — Copy from `convex/tools.ts`, rename table references from "tools" to "apps", update field names

**`convex/app_state.ts`** — Copy from `convex/tool_state.ts`, rename table reference from "toolState" to "appState", field from "projectId" to "appId"

- [ ] **Step 4: Run tests**

Run: `npx vitest run convex/__tests__/blueprints.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add convex/messages.ts convex/agent_context.ts convex/blueprints.ts convex/phases.ts convex/generated_files.ts convex/versions.ts convex/apps.ts convex/app_state.ts convex/__tests__/blueprints.test.ts
git commit -m "feat: add all pipeline CRUD modules — messages, context, blueprints, phases, files, versions"
```

---

## Phase 2: Zod Schemas & Pipeline Prompts

### Task 4: Zod Schemas for Blueprint & Phases

**Files:**
- Create: `src/lib/agent/schemas/index.ts`
- Test: `src/lib/agent/schemas/__tests__/schemas.test.ts`

- [ ] **Step 1: Write schema validation tests**

```typescript
// src/lib/agent/schemas/__tests__/schemas.test.ts
import { describe, test, expect } from "vitest";
import { TherapyBlueprintSchema, PhaseConceptSchema, PhaseImplementationSchema } from "../index";

describe("TherapyBlueprintSchema", () => {
  test("validates a complete blueprint", () => {
    const result = TherapyBlueprintSchema.safeParse({
      title: "Morning Routine",
      projectName: "morning-routine",
      description: "Visual schedule for morning routines",
      detailedDescription: "A drag-and-drop visual schedule...",
      therapyGoal: "Executive function — task sequencing",
      targetSkill: "Following multi-step routines independently",
      ageRange: "preschool",
      interactionModel: "drag",
      reinforcementStrategy: { type: "tokens", description: "5 stars" },
      dataTracking: ["steps completed", "time to completion"],
      accessibilityNotes: ["Large touch targets", "High contrast mode"],
      colorPalette: ["#4CAF50", "#2196F3"],
      views: [{ name: "Schedule", description: "Main view" }],
      userFlow: { uiLayout: "Single column", uiDesign: "Card-based", userJourney: "Drag steps" },
      frameworks: ["motion"],
      pitfalls: ["Don't use small touch targets"],
      implementationRoadmap: [{ phase: "Layout", description: "Build step cards" }],
      initialPhase: {
        name: "Layout",
        description: "Build step cards",
        files: [{ path: "src/App.tsx", purpose: "Main layout", changes: null }],
        installCommands: [],
        lastPhase: false,
      },
    });
    expect(result.success).toBe(true);
  });

  test("rejects missing therapy fields", () => {
    const result = TherapyBlueprintSchema.safeParse({
      title: "Test",
      projectName: "test",
    });
    expect(result.success).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/agent/schemas/__tests__/schemas.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement schemas**

Create `src/lib/agent/schemas/index.ts` with `TherapyBlueprintSchema`, `PhaseConceptSchema`, `PhaseImplementationSchema` exactly as defined in the spec (Section 4).

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/lib/agent/schemas/__tests__/schemas.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/agent/schemas/
git commit -m "feat: add Zod schemas for TherapyBlueprint, PhaseConcept, PhaseImplementation"
```

---

### Task 5: Pipeline Tools & Prompts

**Files:**
- Create: `convex/pipeline_tools.ts`
- Create: `convex/pipeline_prompts.ts`

- [ ] **Step 1: Create tool definitions using `betaZodTool` helper**

Create `convex/pipeline_tools.ts` using the Anthropic SDK's `betaZodTool()` helper for Zod-based tool definitions. This integrates with `toolRunner()` to automate the tool execution loop.

**Important SDK pattern:** Instead of manually checking `stop_reason === 'tool_use'` and looping, use `anthropic.beta.messages.toolRunner()` which handles the entire tool loop automatically:

```typescript
// convex/pipeline_tools.ts
"use node";
import { betaZodTool } from "@anthropic-ai/sdk/resources/beta/messages";
import { z } from "zod";
import { ActionCtx } from "./_generated/server";
import { internal } from "./_generated/api";

// Tool definitions using betaZodTool (integrates with toolRunner)
export function createPipelineTools(ctx: ActionCtx) {
  return {
    search_knowledge: betaZodTool({
      name: "search_knowledge",
      description: "Search the therapy knowledge base for ABA, speech therapy, and developmental milestone information",
      inputSchema: z.object({
        query: z.string().describe("Search query"),
        category: z.enum(["aba-terminology", "speech-therapy", "tool-patterns", "developmental-milestones", "iep-goals"]).optional(),
      }),
      run: async (input) => {
        const result = await ctx.runAction(internal.knowledge.searchInternal, input);
        return result;
      },
    }),

    select_template: betaZodTool({
      name: "select_template",
      description: "Select the best therapy E2B template based on interaction model",
      inputSchema: z.object({
        interactionModel: z.string(),
        reinforcementType: z.string().optional(),
      }),
      run: async (input) => {
        // Rule-based: map interaction model → template
        const templateMap: Record<string, string> = {
          tap: "therapy-communication",
          drag: "therapy-schedule",
          sequence: "therapy-schedule",
          match: "therapy-academic",
          timer: "therapy-behavior",
          "free-form": "vite-therapy",
        };
        return templateMap[input.interactionModel] ?? "vite-therapy";
      },
    }),

    generate_image: betaZodTool({
      name: "generate_image",
      description: "Generate a therapy-appropriate illustration for picture cards",
      inputSchema: z.object({
        label: z.string(),
        category: z.string().optional(),
      }),
      run: async (input) => {
        return await ctx.runAction(internal.aiActions.generateImageInternal, input);
      },
    }),

    generate_speech: betaZodTool({
      name: "generate_speech",
      description: "Generate TTS audio for communication board labels",
      inputSchema: z.object({
        text: z.string(),
        voiceId: z.string().optional(),
      }),
      run: async (input) => {
        return await ctx.runAction(internal.aiActions.generateSpeechInternal, input);
      },
    }),
  };
}
```

Create `convex/pipeline_tools.ts` with these definitions. Also add `searchKnowledgeTool` and `selectTemplateTool` as raw Anthropic.Tool objects (JSON Schema format) for steps that don't use `toolRunner`.

- [ ] **Step 2: Create system prompts**

Create `convex/pipeline_prompts.ts` with exported prompt constants. Draft for the most critical prompt:

```typescript
// convex/pipeline_prompts.ts

export const BLUEPRINT_SYSTEM_PROMPT = `You are Bridges, a therapy app architect specializing in building interactive tools for ABA therapists, speech therapists, and parents of autistic children.

Your task: Create a structured therapy app blueprint (PRD) from the user's request.

THERAPY DOMAIN EXPERTISE:
- ABA therapy: discrete trial training, token economies, reinforcement schedules, prompt hierarchies
- Speech therapy: AAC boards, PECS, communication boards, sentence strips, TTS integration
- Visual supports: visual schedules, first-then boards, choice boards, social stories
- Data collection: trial counts, accuracy percentages, duration tracking, prompt levels

DESIGN REQUIREMENTS:
- Touch-first: minimum 44px touch targets, designed for iPad use in therapy sessions
- Child-friendly: bright colors, clear icons, Nunito headings + Inter body text
- Reinforcement: every app should have meaningful feedback (animations, sounds, tokens)
- Accessibility: high contrast mode support, reduced motion support, clear visual hierarchy
- Use therapy-ui.css classes: .card-interactive, .tap-target, .token-star, .schedule-step, .board-cell, .celebration-burst

OUTPUT: You MUST respond with valid JSON matching the TherapyBlueprintSchema. Include all required fields including therapyGoal, targetSkill, ageRange, interactionModel, reinforcementStrategy, dataTracking, accessibilityNotes, and an initialPhase with specific file paths and purposes.`;

export const PHASE_GENERATION_PROMPT = `You are planning the next development phase for a therapy app. Given the blueprint and current codebase state, design the next phase as a deployable milestone.

RULES:
- Each phase must be independently deployable and functional
- Prioritize runtime errors over new features
- Use therapy-ui.css classes for all visual elements
- Maximum 6 files per phase to keep changes reviewable
- Set lastPhase: true only when the blueprint's roadmap is >97% complete

OUTPUT: Valid JSON matching PhaseConceptSchema with file paths, purposes, and spec-like change descriptions.`;

export const PHASE_IMPLEMENTATION_PROMPT = `You are implementing a development phase for a therapy app. Generate complete, working React file contents for each file in the phase.

RULES:
- Write complete file contents, not diffs or partial code
- Import from the template's existing components and hooks
- Use therapy-ui.css classes for styling (.card-interactive, .tap-target, etc.)
- Tailwind v4 for additional styling — mobile-first, no inline styles
- Touch targets minimum 44px, high contrast colors
- All interactive elements must provide visual + audio feedback
- Use useLocalStorage hook for device persistence

OUTPUT: Valid JSON matching PhaseImplementationSchema with filePath, fileContents, filePurpose for each file.`;

export const VALIDATION_PROMPT = `You are debugging a therapy app after deployment. Given runtime errors, identify the root cause and generate fixed file contents.

Focus on:
1. React render errors (infinite loops, undefined access)
2. Import errors (wrong paths, missing exports)
3. Vite build failures (syntax errors, missing deps)

OUTPUT: Fixed file contents for each broken file. Explain what was wrong and what you fixed.`;
```

Also add `generate_image` and `generate_speech` tools to `pipeline_tools.ts` that dispatch to existing `convex/aiActions.ts`:

```typescript
export const generateImageTool: Anthropic.Tool = {
  name: "generate_image",
  description: "Generate a therapy-appropriate illustration for picture cards",
  input_schema: {
    type: "object" as const,
    properties: {
      label: { type: "string", description: "What to illustrate" },
      category: { type: "string", description: "Therapy category" },
    },
    required: ["label"]
  }
};

export const generateSpeechTool: Anthropic.Tool = {
  name: "generate_speech",
  description: "Generate TTS audio for communication board labels",
  input_schema: {
    type: "object" as const,
    properties: {
      text: { type: "string" },
      voiceId: { type: "string" },
    },
    required: ["text"]
  }
};
```

- [ ] **Step 3: Commit**

```bash
git add convex/pipeline_tools.ts convex/pipeline_prompts.ts
git commit -m "feat: add pipeline tool definitions and system prompts"
```

---

## Phase 3: Pipeline Orchestration (Core Engine)

### Task 6: Pipeline Dispatcher + Blueprint Step

**Files:**
- Create: `convex/pipeline.ts`
- Test: `convex/__tests__/pipeline.test.ts`

- [ ] **Step 1: Install @anthropic-ai/sdk**

Run: `npm install @anthropic-ai/sdk`
Add `ANTHROPIC_API_KEY` to Convex env vars: `npx convex env set ANTHROPIC_API_KEY <key>`
(Retrieve key from Bitwarden: `bw get item "Anthropic API Key"`)

- [ ] **Step 2: Write pipeline dispatcher test**

Test the executeStep dispatcher routes to the correct handler based on session state. Use a mock Anthropic client for unit tests.

- [ ] **Step 3: Implement pipeline.ts — dispatcher + generateBlueprint using toolRunner**

Create `convex/pipeline.ts` with `"use node";` directive. Implement:
1. `executeStep` internalAction — reads session state, dispatches to handler, catches errors → setFailed
2. `generateBlueprint` handler — uses `anthropic.beta.messages.toolRunner()` to automate the tool loop:

```typescript
// convex/pipeline.ts
"use node";
import Anthropic from "@anthropic-ai/sdk";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { createPipelineTools } from "./pipeline_tools";
import { BLUEPRINT_SYSTEM_PROMPT } from "./pipeline_prompts";

const anthropic = new Anthropic(); // Uses ANTHROPIC_API_KEY env var

export const executeStep = internalAction({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, { sessionId }) => {
    const session = await ctx.runQuery(internal.sessions.getInternal, { sessionId });
    if (!session) return;
    try {
      switch (session.state) {
        case "blueprinting": await generateBlueprint(ctx, sessionId, session); break;
        // ... other states
      }
    } catch (error) {
      await ctx.runMutation(internal.sessions.setFailed, {
        sessionId,
        reason: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },
});

async function generateBlueprint(ctx, sessionId, session) {
  const tools = createPipelineTools(ctx);

  // toolRunner automates: call model → execute tools → send results → repeat
  const runner = anthropic.beta.messages.toolRunner({
    model: "claude-sonnet-4-5-20250929",  // Verify latest model ID at implementation
    max_tokens: 4096,
    system: BLUEPRINT_SYSTEM_PROMPT,
    messages: [{ role: "user", content: `Build a therapy app: ${session.query}` }],
    tools: [tools.search_knowledge],
    max_iterations: 5,  // Safety: prevent infinite loops
  });

  const finalMessage = await runner.runUntilDone();
  // Parse the final text response as TherapyBlueprintSchema
  // Write to blueprints table, set state to "blueprinting" (awaiting approval)
}
```

**Key SDK pattern:** `toolRunner` handles the entire tool loop — define tools with `betaZodTool`, pass to `toolRunner`, call `runUntilDone()`. No manual `stop_reason` checking needed. Use `max_iterations` to prevent runaway loops.

Reference spec Section 5 for the full code pattern. Also reference the [Anthropic SDK helpers documentation](https://github.com/anthropics/anthropic-sdk-typescript/blob/main/helpers.md) for `toolRunner` details.

- [ ] **Step 4: Test end-to-end with a real LLM call**

Create a manual test script or use the Convex dashboard to:
1. Create a session with `api.sessions.create`
2. Update state to "blueprinting" with `internal.sessions.updateState`
3. Verify `internal.pipeline.executeStep` is scheduled
4. Check that a blueprint document is created

- [ ] **Step 5: Commit**

```bash
git add convex/pipeline.ts convex/__tests__/pipeline.test.ts
git commit -m "feat: add pipeline dispatcher + blueprint generation step"
```

---

### Task 7: Template Selection + Phase Generation Steps

**Files:**
- Modify: `convex/pipeline.ts`

- [ ] **Step 1: Implement selectTemplate handler**

Rule-based template selection: match blueprint's `interactionModel` and `reinforcementStrategy` to one of the 4 therapy templates. For now, map all to `vite-therapy` (the only existing template) with a TODO for the other 3.

- [ ] **Step 2: Implement generatePhase handler**

Call Anthropic with PHASE_GENERATION_PROMPT + current codebase context (file list from generated_files table) + blueprint. Parse response as PhaseConceptSchema. Create phase document. Update session state.

- [ ] **Step 3: Implement implementPhase handler**

Call Anthropic with PHASE_IMPLEMENTATION_PROMPT + phase concept + template file tree. Parse response as PhaseImplementationSchema. Write files to generated_files table. Update phase status.

- [ ] **Step 4: Test the full blueprinting → template → phase_generating → phase_implementing flow**

Manually trigger a session and verify state transitions through the pipeline.

- [ ] **Step 5: Commit**

```bash
git add convex/pipeline.ts
git commit -m "feat: add template selection, phase generation, and phase implementation steps"
```

---

### Task 8: Deploy + Validate + Version Steps

**Files:**
- Modify: `convex/pipeline.ts`
- Create: `convex/e2b.ts` (E2B sandbox operations — `"use node;"`)

- [ ] **Step 1: Create convex/e2b.ts with sandbox operations**

E2B logic MUST live in `convex/` (not `src/features/`) because it runs inside Convex `internalAction`s. Port and adapt logic from `src/features/builder-v2/lib/e2b.ts`:

```typescript
// convex/e2b.ts
"use node";
import { Sandbox } from "@e2b/code-interpreter";

const TEMPLATE_REGISTRY: Record<string, string> = {
  "vite-therapy": "wsjspn0oy5ygip6y8rjr",
  // TODO: Add therapy-communication, therapy-behavior, therapy-schedule, therapy-academic
};

export async function createAndDeploySandbox(
  templateName: string,
  files: { filePath: string; fileContents: string }[],
  commands: string[] = []
): Promise<{ sandboxId: string; previewUrl: string }> {
  const templateId = TEMPLATE_REGISTRY[templateName] ?? TEMPLATE_REGISTRY["vite-therapy"];
  const sandbox = await Sandbox.create(templateId, { apiKey: process.env.E2B_API_KEY });

  for (const file of files) {
    await sandbox.files.write(`/home/user/app/${file.filePath}`, file.fileContents);
  }
  for (const cmd of commands) {
    await sandbox.commands.run(cmd, { cwd: "/home/user/app" });
  }

  // Wait for Vite HMR
  await new Promise(r => setTimeout(r, 2000));

  // Note: verify getHost vs getUrl at implementation time — API may vary by version
  const previewUrl = sandbox.getHost?.(5173) ?? sandbox.getUrl?.(5173) ?? "";

  return {
    sandboxId: sandbox.sandboxId,
    previewUrl: `https://${previewUrl}`,
  };
}

// Cleanup — call when session is abandoned or completed
export async function killSandbox(sandboxId: string): Promise<void> {
  try {
    const sandbox = await Sandbox.connect(sandboxId, { apiKey: process.env.E2B_API_KEY });
    await sandbox.kill();
  } catch {
    // Sandbox may have already timed out — ignore
  }
}

export async function getRuntimeErrors(sandboxId: string): Promise<string[]> {
  const sandbox = await Sandbox.connect(sandboxId, { apiKey: process.env.E2B_API_KEY });
  // Check Vite build output for errors
  const result = await sandbox.commands.run("cat /tmp/vite-errors.log 2>/dev/null || echo ''", {
    cwd: "/home/user/app",
  });
  const errors = result.stdout.trim().split("\n").filter(Boolean);
  return errors;
}
```

- [ ] **Step 2: Implement deployToSandbox handler in pipeline.ts**

Import from `./e2b` and use in the `deploying` state handler. Read files from generated_files table, pass to `createAndDeploySandbox`. Save previewUrl to session.

- [ ] **Step 2: Implement validatePhase handler**

After deployment, collect runtime errors from E2B sandbox. If errors found and fixAttempts < 2: call Anthropic to regenerate broken files, redeploy. If clean: mark phase completed, create version snapshot, advance to next phase or finalizing.

- [ ] **Step 3: Implement version snapshot creation**

After each phase completes: read all files for this session, compute diff against previous version (added/modified/deleted paths), create version document with fileRefs.

- [ ] **Step 4: Implement finalizing + reviewing handlers**

Finalizing: run one final phase gen+impl if needed, then mark mvpGenerated=true. Reviewing: check for runtime errors, transition to complete if clean.

- [ ] **Step 5: Test full pipeline end-to-end**

Create a session with a simple prompt ("Build a 5-star token board"). Verify it goes through all states: idle → blueprinting → (approve) → template_selecting → phase_generating → phase_implementing → deploying → validating → complete.

- [ ] **Step 6: Commit**

```bash
git add convex/pipeline.ts convex/e2b.ts
git commit -m "feat: add deploy, validate, version, finalize, review pipeline steps"
```

---

## Phase 4: API Routes (Thin Entry Points)

### Task 9: API Routes

**Files:**
- Create: `src/app/api/agent/build/route.ts`
- Create: `src/app/api/agent/approve/route.ts`
- Create: `src/app/api/agent/message/route.ts`

- [ ] **Step 1: Implement POST /api/agent/build**

```typescript
// src/app/api/agent/build/route.ts
import { ConvexHTTPClient } from "convex/browser";
import { api } from "../../../../convex/_generated/api";

const convex = new ConvexHTTPClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(req: Request) {
  const { prompt, title } = await req.json();

  if (!prompt || typeof prompt !== "string") {
    return Response.json({ error: "prompt is required" }, { status: 400 });
  }

  // startBuild is a PUBLIC mutation that:
  // 1. Creates the session
  // 2. Sets state to "blueprinting"
  // 3. Schedules internal.pipeline.executeStep via scheduler
  // This avoids calling internal mutations from ConvexHTTPClient (which is forbidden)
  const sessionId = await convex.mutation(api.sessions.startBuild, {
    title: title ?? "New App",
    query: prompt,
  });

  return Response.json({ sessionId });
}
```

**Important:** `ConvexHTTPClient` can only call public (`api.*`) functions, NOT `internal.*`. The `startBuild` mutation is a public wrapper that internally calls `ctx.scheduler.runAfter(0, internal.pipeline.executeStep, ...)`. Similarly, `api.blueprints.approve` and `api.sessions.addFollowUp` are public mutations that internally schedule pipeline steps.

- [ ] **Step 2: Implement POST /api/agent/approve**

Thin wrapper that calls `api.blueprints.approve` mutation.

- [ ] **Step 3: Implement POST /api/agent/message**

Thin wrapper that adds user message to session and re-triggers pipeline.

- [ ] **Step 4: Test with curl**

```bash
curl -X POST http://localhost:3000/api/agent/build \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Build a 5-star token board"}'
```
Expected: `{ "sessionId": "..." }`

- [ ] **Step 5: Commit**

```bash
git add src/app/api/agent/
git commit -m "feat: add thin API routes for build, approve, message"
```

---

## Phase 5: Frontend Builder UI

### Task 10: Session Hooks

**Files:**
- Create: `src/features/builder/hooks/use-session.ts`

- [ ] **Step 1: Create Convex subscription hooks**

```typescript
// src/features/builder/hooks/use-session.ts
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";

// Convex useQuery skip pattern: function ref is always provided, args can be "skip"
export function useSession(sessionId: Id<"sessions"> | null) {
  return useQuery(api.sessions.get, sessionId ? { sessionId } : "skip");
}

export function useSessionMessages(sessionId: Id<"sessions"> | null) {
  return useQuery(api.messages.list, sessionId ? { sessionId } : "skip");
}

export function useSessionPhases(sessionId: Id<"sessions"> | null) {
  return useQuery(api.phases.list, sessionId ? { sessionId } : "skip");
}

export function useSessionFiles(sessionId: Id<"sessions"> | null) {
  return useQuery(api.generatedFiles.list, sessionId ? { sessionId } : "skip");
}

export function useBlueprint(sessionId: Id<"sessions"> | null) {
  return useQuery(api.blueprints.getBySession, sessionId ? { sessionId } : "skip");
}
```

- [ ] **Step 2: Commit**

```bash
git add src/features/builder/hooks/
git commit -m "feat: add Convex subscription hooks for builder UI"
```

---

### Task 11: Builder Page Shell + Chat Panel

**Files:**
- Create: `src/features/builder/components/builder-page.tsx`
- Create: `src/features/builder/components/chat-panel.tsx`
- Create: `src/features/builder/components/blueprint-card.tsx`
- Create: `src/app/(app)/builder/page.tsx`

- [ ] **Step 1: Build the three-panel layout shell**

Use shadcn `ResizablePanel` for the three-column layout. Chat panel on left, code panel in middle, preview panel on right. Phase timeline bar at the bottom.

- [ ] **Step 2: Build the chat panel**

Display messages from `useSessionMessages`. Show prompt input when state is "idle" or "complete". Show blueprint card when state is "blueprinting". Show status messages for other states.

- [ ] **Step 3: Build the blueprint approval card**

Structured card showing therapy-specific fields from the blueprint. "Looks Good" and "Request Changes" buttons. Calls `api.blueprints.approve` or shows feedback input.

- [ ] **Step 4: Create the page wrapper**

```typescript
// src/app/(app)/builder/page.tsx
import { BuilderPage } from "@/features/builder/components/builder-page";
export default function Page() {
  return <BuilderPage />;
}
```

- [ ] **Step 5: Test in browser**

Navigate to `/builder`. Enter a prompt. Verify blueprint card appears after LLM call completes. Click "Looks Good". Verify pipeline advances.

- [ ] **Step 6: Commit**

```bash
git add src/features/builder/ src/app/\(app\)/builder/
git commit -m "feat: add builder page with chat panel and blueprint approval card"
```

---

### Task 12: Code Panel + Preview Panel + Phase Timeline

**Files:**
- Create: `src/features/builder/components/code-panel.tsx`
- Create: `src/features/builder/components/preview-panel.tsx`
- Create: `src/features/builder/components/phase-timeline.tsx`

- [ ] **Step 1: Build the code panel**

File explorer sidebar (list of file paths from `useSessionFiles`). Click a file to show its contents with syntax highlighting (use a simple `<pre>` with Tailwind prose classes — Monaco editor is a future enhancement).

- [ ] **Step 2: Build the preview panel**

Iframe pointing to `session.previewUrl`. Show placeholder when no URL. Show loading spinner when state is "deploying". Add responsive toggle buttons (mobile/tablet/desktop widths).

- [ ] **Step 3: Build the phase timeline**

Horizontal bar at bottom. Each phase from `useSessionPhases` rendered as a segment. Colors: gray=pending, blue=active (generating/implementing/deploying/validating), green=completed, red=failed. Show phase name on hover.

- [ ] **Step 4: Test full flow in browser**

Build a therapy app end-to-end. Verify: blueprint card → approval → phases appearing in timeline → files appearing in code panel → preview loading in iframe.

- [ ] **Step 5: Commit**

```bash
git add src/features/builder/components/
git commit -m "feat: add code panel, preview panel, and phase timeline"
```

---

## Phase 6: Cleanup & Removal

### Task 13: Remove Legacy Code

**Files:**
- Remove: `convex/agents/` (entire directory)
- Remove: `convex/chat/` (entire directory)
- Remove: `convex/projects.ts`
- Remove: `convex/tools.ts`
- Remove: `convex/tool_state.ts`
- Remove: `src/features/therapy-tools/` (entire directory)
- Remove: `src/app/api/chat/` (entire directory)

- [ ] **Step 1: Delete legacy Convex files**

```bash
rm -rf convex/agents/ convex/chat/ convex/projects.ts convex/tools.ts convex/tool_state.ts
```

- [ ] **Step 2: Delete legacy frontend files**

```bash
rm -rf src/features/therapy-tools/ src/features/builder-v2/ src/app/api/chat/
```

- [ ] **Step 3: Remove unused dependencies**

```bash
npm uninstall @convex-dev/agent @ai-sdk/anthropic @assistant-ui/react
```

Verify `@convex-dev/rag` still works (it may pull `ai` as a peer dep — if so, keep `ai` installed).

- [ ] **Step 4: Fix all import errors**

Run: `npx tsc --noEmit`
Fix any broken imports across the codebase that referenced removed files.

- [ ] **Step 5: Run full test suite**

Run: `npx vitest run`
Expected: All new tests pass. Old tests referencing removed code should have been deleted with their source files.

- [ ] **Step 6: Verify Convex deploys**

Run: `npx convex dev --once`
Expected: No errors.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "chore: remove legacy config-based generation — agents, chat, therapy-tools, api/chat"
```

---

### Task 14: Update CLAUDE.md & Documentation

**Files:**
- Modify: `CLAUDE.md`
- Modify: `CHANGELOG.md`

- [ ] **Step 1: Update CLAUDE.md**

Update the following sections:
- **Stack** — Replace Vercel AI SDK references with Anthropic SDK. Update AI Chat section.
- **Architecture** — Replace "Config-Based Tool Generation" with "Phasic Code Generation Pipeline"
- **Code Conventions > Convex** — Add pipeline.ts conventions
- **Code Conventions > AI/Chat** — Replace with Anthropic SDK patterns
- **Gotchas** — Add any new gotchas discovered during implementation
- **Terminology** — Note "app" replaces "tool"

- [ ] **Step 2: Update CHANGELOG.md**

Add entry for this major refactor with all changes, decisions, and gotchas.

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md CHANGELOG.md
git commit -m "docs: update CLAUDE.md and CHANGELOG for vibesdk refactor"
```

---

## Summary

| Phase | Tasks | What It Delivers |
|-------|-------|-----------------|
| 1: Schema & Backend | Tasks 1-3 | All Convex tables, CRUD modules, state machine |
| 2: Schemas & Prompts | Tasks 4-5 | Zod validation, tool defs, system prompts |
| 3: Pipeline | Tasks 6-8 | Full pipeline: blueprint → phase → deploy → validate |
| 4: API Routes | Task 9 | Thin entry points for frontend |
| 5: Frontend | Tasks 10-12 | Three-panel builder with real-time progress |
| 6: Cleanup | Tasks 13-14 | Remove legacy code, update docs |

**Total: 14 tasks, ~6 phases, each phase produces testable working software.**
