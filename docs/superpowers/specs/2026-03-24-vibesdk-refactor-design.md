# Bridges Major Refactor: VibeSDK-Inspired Full Code Generation

**Date:** 2026-03-24
**Status:** Approved (brainstorming complete)
**Scope:** Big bang refactor — replace config-based tool generation with full code generation, Anthropic SDK custom agent loop, phasic state machine, therapy blueprints, dynamic templates, version history

---

## Table of Contents

1. [Summary of Decisions](#1-summary-of-decisions)
2. [System Architecture](#2-system-architecture)
3. [State Machine & Session Model](#3-state-machine--session-model)
4. [Blueprint & Phase Schemas](#4-blueprint--phase-schemas)
5. [Claude Agent SDK Integration & MCP Tools](#5-claude-agent-sdk-integration--mcp-tools)
6. [E2B Templates & Dynamic Selection](#6-e2b-templates--dynamic-selection)
7. [Version History](#7-version-history)
8. [Validation Loop](#8-validation-loop)
9. [Frontend UX](#9-frontend-ux)
10. [Dependency Changes](#10-dependency-changes)
11. [Convex Schema Changes](#11-convex-schema-changes)
12. [File System Changes](#12-file-system-changes)
13. [Terminology Changes](#13-terminology-changes)
14. [Future Considerations](#14-future-considerations)

---

## 1. Summary of Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Agent runtime | Anthropic SDK with custom agent loop + Convex as DB | Custom phasic agent loop using `@anthropic-ai/sdk` Messages API with tool_use; Convex for persistence + real-time |
| Domain focus | Therapy-first code gen | Differentiator for vibeathon; domain expertise stays locked in |
| Behavior mode | Phasic (deterministic state machine) | Predictable, debuggable, great progress UX for non-technical therapists |
| Version control | Convex-based history with diffs | Clean, useful undo/diff without git complexity |
| Blueprint | Structured therapy-specific fields | Therapist-facing validation step builds trust and ensures therapeutic alignment |
| Preview/deploy | E2B with dynamic template selection | Keeps working E2B infra, adds template intelligence for better output quality |
| Migration strategy | Big bang | Clean architecture from day one, no legacy code |
| Terminology | "app" replaces "tool" everywhere | More professional, less limiting |

---

## 2. System Architecture

### What Gets Removed

- `convex/agents/bridges.ts` — Convex Agent definition + 4 tools
- `convex/chat/actions.ts` + `streaming.ts` — Convex Agent streaming orchestration
- `src/features/therapy-tools/` — Entire directory (config-based generation: tool-configs.ts, tool-renderer.tsx, fixed components)
- `src/app/api/chat/plan/route.ts` + `generate/route.ts` — Current Vercel AI SDK streaming routes
- `@convex-dev/agent`, `@ai-sdk/anthropic`, `ai` (Vercel AI SDK) — removed as dependencies
- `@assistant-ui/react` — no longer needed

### What Stays

- Convex backend (real-time subscriptions, file storage, queries/mutations)
- E2B sandbox with `vite-therapy` template family (expanded)
- RAG knowledge base (110 therapy entries, Gemini embeddings via `@convex-dev/rag`)
- ElevenLabs TTS + Google Imagen for image generation
- Next.js App Router frontend, shadcn/ui, Tailwind v4
- Clerk auth (deferred), Vercel deployment

### Three-Layer Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  LAYER 1: NEXT.JS API — Thin Entry Points                      │
│  POST /api/agent/build     — create session, schedule pipeline  │
│  POST /api/agent/approve   — approve blueprint via mutation     │
│  POST /api/agent/message   — send follow-up via mutation        │
│                                                                  │
│  API routes are thin wrappers that call Convex mutations.       │
│  All pipeline logic lives in Convex internalActions.            │
├─────────────────────────────────────────────────────────────────┤
│  LAYER 2: CONVEX — State, Persistence & Pipeline Orchestration  │
│  Pipeline: internalActions with "use node" + @anthropic-ai/sdk  │
│  Tables: sessions, messages, agentContext, blueprints, phases,  │
│          files, versions, apps, appState, knowledgeBase, ttsCache│
│  Real-time subscriptions → frontend                             │
│  Scheduler chains pipeline steps (each step < 10 min)           │
│  Queries used BY the frontend to render progress                │
├─────────────────────────────────────────────────────────────────┤
│  LAYER 3: E2B SANDBOX — Preview & Execution                    │
│  Dynamic template selection (4 therapy templates)               │
│  Multi-file writes from phase implementation                    │
│  Vite HMR for live preview                                      │
│  Runtime error collection for validation loop                   │
└─────────────────────────────────────────────────────────────────┘
```

**Serverless timeout strategy:** Each API route executes ONE pipeline step (blueprint generation, template selection, phase planning, phase implementation, deployment, validation). Each step completes within Vercel's 60-second timeout (Pro plan). After each step writes state to Convex, a Convex `scheduler.runAfter(0, ...)` triggers the next step via the API route. The frontend subscribes to Convex for real-time progress and never needs to hold a long connection.

**Convex HTTP client:** Tools interact with Convex via `ConvexHTTPClient` from `convex/browser`:
```typescript
import { ConvexHTTPClient } from "convex/browser";
const convex = new ConvexHTTPClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
// Public mutations — no admin key needed for session/phase updates
await convex.mutation(api.sessions.updateState, { sessionId, state, stateMessage });
```

### Data Flow for a Build

```
User: "Build a visual schedule for morning routine"
  → POST /api/agent/build
  → Claude Agent SDK starts phasic pipeline:
     1. Blueprint generation (therapy-structured PRD)
     2. Template selection (picks best E2B therapy template)
     3. Phase loop:
        a. PHASE_GENERATING — LLM plans next phase (file list + specs)
        b. PHASE_IMPLEMENTING — LLM generates file contents
        c. Deploy to E2B sandbox
        d. Validate (runtime errors, build success)
        e. If errors: regenerate broken files, redeploy (max 2 attempts)
        f. Persist phase result + create version snapshot
        g. Repeat until done
     4. FINALIZING — final review pass
     5. REVIEWING — runtime error check, auto-fix if needed
  → Each step writes state to Convex via mutations
  → Convex scheduler auto-chains to next step
  → Frontend subscribes to Convex queries, shows real-time progress
```

---

## 3. State Machine & Session Model

### States and Transitions

```
IDLE → BLUEPRINTING → TEMPLATE_SELECTING → PHASE_GENERATING → PHASE_IMPLEMENTING
  → DEPLOYING → VALIDATING → PHASE_GENERATING (loop) → FINALIZING → REVIEWING → COMPLETE
```

| State | What Happens | Transitions To |
|-------|-------------|----------------|
| `idle` | Session created, waiting for user prompt | `blueprinting` |
| `blueprinting` | LLM generates therapy blueprint. Streamed to frontend for preview. | `template_selecting` (user approves) or stay (user requests changes) or `failed` |
| `template_selecting` | LLM analyzes blueprint, picks best E2B therapy template | `phase_generating` or `failed` |
| `phase_generating` | LLM plans next phase: file list, specs, install commands | `phase_implementing` or `failed` |
| `phase_implementing` | LLM generates actual file contents for the phase | `deploying` or `failed` |
| `deploying` | Write files to E2B sandbox, run install commands, wait for Vite HMR | `validating` or `failed` |
| `validating` | Check for runtime errors, render success. If errors: auto-fix attempt then re-deploy (max 2 attempts) | `phase_generating` (more phases) or `finalizing` (last phase or counter exhausted) |
| `finalizing` | Final review pass, one last phase gen+impl if needed | `reviewing` or `failed` |
| `reviewing` | Deep error check. If clean: done. If errors: fix loop | `complete` (clean) or `validating` (fix attempt) |
| `complete` | MVP generated, preview URL available, user can iterate | `phase_generating` (user follow-up message) |
| `failed` | Unrecoverable error (LLM failure, E2B timeout, etc.) | `blueprinting` (user retries) or `phase_generating` (user retries from last good state) |

**Key design choice:** `blueprinting` has an explicit user approval gate. VibeSDK generates blueprints silently — we show them to therapists for validation before building.

**Phase counter:** Starts at 8 (therapy apps are simpler than general web apps). Decremented after each phase implementation. When user sends a follow-up message after `complete`, counter recharges to 3.

### Session Schema (Convex)

```typescript
sessions: defineTable({
  // Identity
  userId: v.optional(v.string()),
  title: v.string(),
  query: v.string(),

  // State machine
  state: v.union(
    v.literal("idle"), v.literal("blueprinting"),
    v.literal("template_selecting"), v.literal("phase_generating"),
    v.literal("phase_implementing"), v.literal("deploying"),
    v.literal("validating"), v.literal("finalizing"),
    v.literal("reviewing"), v.literal("complete"),
    v.literal("failed")
  ),
  stateMessage: v.optional(v.string()),
  failureReason: v.optional(v.string()),  // Set when state is "failed"
  lastGoodState: v.optional(v.string()),  // State before failure, for retry

  // Blueprint
  blueprintId: v.optional(v.id("blueprints")),

  // Template
  templateName: v.optional(v.string()),

  // Phase tracking
  currentPhaseIndex: v.number(),
  totalPhasesPlanned: v.optional(v.number()),
  phasesRemaining: v.number(),

  // Sandbox
  sandboxId: v.optional(v.string()),
  previewUrl: v.optional(v.string()),

  // Completion
  publishedUrl: v.optional(v.string()),
  mvpGenerated: v.boolean(),
}).index("by_user", ["userId"])

// Messages stored separately to avoid 1MB document size limit
messages: defineTable({
  sessionId: v.id("sessions"),
  role: v.union(v.literal("user"), v.literal("assistant"), v.literal("system")),
  content: v.string(),
  timestamp: v.number(),
}).index("by_session", ["sessionId"])
  .index("by_session_timestamp", ["sessionId", "timestamp"])
```

**Frontend binding:** `useQuery(api.sessions.get, { sessionId })` for state/progress, `useQuery(api.messages.list, { sessionId })` for conversation. Messages are in a separate table to avoid Convex's 1MB document size limit — multi-phase builds with streaming responses grow quickly.

---

## 4. Blueprint & Phase Schemas

### TherapyBlueprintSchema (Zod — structured LLM output)

```typescript
const TherapyBlueprintSchema = z.object({
  // Project identity
  title: z.string(),
  projectName: z.string(),
  description: z.string(),
  detailedDescription: z.string(),

  // Therapy-specific (the differentiator)
  therapyGoal: z.string().describe("What therapeutic outcome this app supports"),
  targetSkill: z.string().describe("Specific skill being practiced"),
  ageRange: z.enum(["toddler", "preschool", "school-age", "adolescent", "adult", "all"]),
  interactionModel: z.enum(["tap", "drag", "sequence", "match", "timer", "free-form"]),
  reinforcementStrategy: z.object({
    type: z.enum(["tokens", "animation", "sound", "points", "completion", "none"]),
    description: z.string(),
  }),
  dataTracking: z.array(z.string()).describe("What to measure: trials, accuracy, duration, prompts needed"),
  accessibilityNotes: z.array(z.string()).describe("Sensory, motor, visual considerations"),

  // Design
  colorPalette: z.array(z.string()).max(4),
  views: z.array(z.object({
    name: z.string(),
    description: z.string(),
  })),
  userFlow: z.object({
    uiLayout: z.string(),
    uiDesign: z.string(),
    userJourney: z.string(),
  }),

  // Technical
  frameworks: z.array(z.string()),
  pitfalls: z.array(z.string()),

  // Roadmap
  implementationRoadmap: z.array(z.object({
    phase: z.string(),
    description: z.string(),
  })),

  // First phase (generated inline, like VibeSDK)
  initialPhase: PhaseConceptSchema,
});
```

### PhaseConceptSchema (what the LLM plans)

```typescript
const PhaseConceptSchema = z.object({
  name: z.string(),
  description: z.string(),
  files: z.array(z.object({
    path: z.string(),
    purpose: z.string(),
    changes: z.string().nullable().describe("Spec-like: WHAT to change, no code"),
  })),
  installCommands: z.array(z.string()),
  lastPhase: z.boolean(),
});
```

### PhaseImplementationSchema (what the LLM generates)

```typescript
const PhaseImplementationSchema = z.object({
  files: z.array(z.object({
    filePath: z.string(),
    fileContents: z.string(),
    filePurpose: z.string(),
  })),
  commands: z.array(z.string()),
});
```

### Convex `blueprints` Table

```typescript
blueprints: defineTable({
  sessionId: v.id("sessions"),
  blueprint: v.any(),
  markdownPreview: v.string(),
  approved: v.boolean(),
  version: v.number(),
}).index("by_session", ["sessionId"])
```

### Blueprint Approval Flow

1. Pipeline action generates TherapyBlueprint via Anthropic SDK, writes to Convex `blueprints` table + markdown preview
2. Pipeline action sets state to `blueprinting` (blocking — does not auto-advance) → **action ends**
3. Frontend subscribes, shows blueprint as a structured card with therapy-specific fields
4. Therapist clicks "Looks Good" → mutation sets `approved: true` + schedules next pipeline step
5. If therapist clicks "Request Changes" and types feedback → mutation adds message, re-schedules blueprint generation step with feedback context
6. No polling — fully event-driven via Convex scheduler

---

## 5. Anthropic SDK Integration & Step-Based Pipeline

### SDK Choice: `@anthropic-ai/sdk` (NOT `claude-agent-sdk`)

**Important:** We use the standard **Anthropic TypeScript SDK** (`@anthropic-ai/sdk`, currently v0.80.0 already installed as a transitive dependency) with the Messages API + `tool_use` pattern. This is NOT the Claude Agent SDK (`@anthropic-ai/claude-agent-sdk`), which is designed for embedding Claude Code as a subprocess and has a different API surface.

The Anthropic SDK provides:
- `client.messages.create()` with `tools` parameter for tool definitions
- `client.beta.messages.toolRunner()` — **automates the tool loop** (recommended over manual loop). Define tools with `betaZodTool()`, pass to `toolRunner`, call `runUntilDone()`. The SDK handles calling the model, executing tools, feeding results back, and repeating until done.
- `max_iterations` parameter on `toolRunner` to prevent infinite loops
- `ToolError` class for reporting tool failures back to the model
- `client.messages.stream()` for streaming responses (future enhancement)
- We implement the state machine; the SDK automates tool execution within each step

### Pipeline Lives in Convex Actions (Not API Routes)

**Key architectural decision:** The pipeline orchestration runs inside **Convex `internalAction`s** (with `"use node";` for Anthropic SDK access), NOT in Next.js API routes. This eliminates the fragile Convex→API→Convex round-trip and leverages Convex's built-in scheduler for step chaining.

**API routes are thin entry points only:**

```
POST /api/agent/build     → Validates input, calls convex mutation to create session
                           → Mutation schedules first pipeline action
                           → Returns sessionId immediately

POST /api/agent/approve   → Calls convex mutation to approve blueprint
                           → Mutation schedules next pipeline action

POST /api/agent/message   → Calls convex mutation to add user follow-up
                           → Mutation recharges counter, schedules pipeline action
```

**Pipeline actions in Convex:**

```typescript
// convex/pipeline.ts
"use node";
import Anthropic from "@anthropic-ai/sdk";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";

const anthropic = new Anthropic(); // Uses ANTHROPIC_API_KEY from Convex env vars

// Main dispatcher — called by scheduler after each state transition
export const executeStep = internalAction({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, { sessionId }) => {
    const session = await ctx.runQuery(internal.sessions.getInternal, { sessionId });
    if (!session) return;

    try {
      switch (session.state) {
        case "blueprinting": await generateBlueprint(ctx, sessionId, session); break;
        case "template_selecting": await selectTemplate(ctx, sessionId, session); break;
        case "phase_generating": await generatePhase(ctx, sessionId, session); break;
        case "phase_implementing": await implementPhase(ctx, sessionId, session); break;
        case "deploying": await deployToSandbox(ctx, sessionId, session); break;
        case "validating": await validatePhase(ctx, sessionId, session); break;
        case "finalizing": await finalize(ctx, sessionId, session); break;
        case "reviewing": await review(ctx, sessionId, session); break;
      }
    } catch (error) {
      // Transition to failed state with reason
      await ctx.runMutation(internal.sessions.setFailed, {
        sessionId,
        reason: error instanceof Error ? error.message : "Unknown error",
      });
    }
  },
});
```

**Convex action timeout:** Convex actions have a 10-minute timeout (configurable up to 15 min). Each individual pipeline step (one LLM call + persistence) should complete well within this. If a step involves multiple LLM calls (e.g., phase implementation with tool_use loop), the action handles the full tool loop internally.

### Custom Agent Loop (per step)

Each step runs a focused LLM call with tools specific to that step:

```typescript
// Inside convex/pipeline.ts
async function generateBlueprint(ctx: ActionCtx, sessionId: Id<"sessions">, session: Session) {
  // Get therapy context from RAG
  const ragContext = await ctx.runAction(internal.knowledge.searchInternal, {
    query: session.query
  });

  // Restore conversation context from previous interactions
  const contextDoc = await ctx.runQuery(internal.agentContext.get, { sessionId });
  const priorMessages = contextDoc?.messages ?? [];

  const messages = [
    ...priorMessages,
    { role: "user" as const, content: buildBlueprintPrompt(session.query, ragContext) }
  ];

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    system: BLUEPRINT_SYSTEM_PROMPT,
    messages,
    tools: [searchKnowledgeTool, selectTemplateTool],
  });

  // Handle tool_use responses in a loop (max 3 iterations)
  // Parse final response as TherapyBlueprintSchema
  // Write blueprint to Convex
  await ctx.runMutation(internal.blueprints.create, { sessionId, blueprint, markdown });
  // Save updated conversation context
  await ctx.runMutation(internal.agentContext.save, { sessionId, messages: [...messages, response] });
  // Update state — does NOT auto-advance (awaits user approval)
  await ctx.runMutation(internal.sessions.updateState, {
    sessionId, state: "blueprinting", stateMessage: "Blueprint ready for review"
  });
}
```

### Agent Context Persistence (Separate Table)

Conversation context is stored in its own table to avoid the 1MB session document limit:

```typescript
// convex/schema.ts
agentContext: defineTable({
  sessionId: v.id("sessions"),
  messages: v.any(),        // Anthropic Messages API conversation history
  tokenCount: v.number(),   // Track size for compaction
}).index("by_session", ["sessionId"])
```

**Compaction:** When `tokenCount` exceeds 100,000, compact older messages by summarizing them into a single system message. This mirrors VibeSDK's `conversationCompactifier` pattern.

### Tool Definitions (Anthropic Messages API format)

Tools are defined per-step, not globally. Each step only gets tools relevant to its task:

```typescript
// convex/pipeline_tools.ts
export const searchKnowledgeTool: Anthropic.Tool = {
  name: "search_knowledge",
  description: "Search the therapy knowledge base for ABA, speech therapy, and developmental milestone information",
  input_schema: {
    type: "object" as const,
    properties: {
      query: { type: "string", description: "Search query" },
      category: { type: "string", enum: ["aba-terminology", "speech-therapy", "tool-patterns", "developmental-milestones", "iep-goals"] }
    },
    required: ["query"]
  }
};

export const selectTemplateTool: Anthropic.Tool = {
  name: "select_template",
  description: "Select the best therapy E2B template based on the blueprint's interaction model and reinforcement strategy",
  input_schema: {
    type: "object" as const,
    properties: {
      interactionModel: { type: "string" },
      reinforcementType: { type: "string" },
      primaryView: { type: "string" },
    },
    required: ["interactionModel"]
  }
};

// Tool execution handler (runs inside Convex action context)
export async function executeToolCall(
  ctx: ActionCtx, toolName: string, toolInput: Record<string, unknown>
): Promise<string> {
  switch (toolName) {
    case "search_knowledge":
      return await ctx.runAction(internal.knowledge.searchInternal, toolInput);
    case "select_template":
      return selectTemplateByRules(toolInput); // Rule-based, no LLM needed
    case "generate_image":
      return await ctx.runAction(internal.aiActions.generateImage, toolInput);
    case "generate_speech":
      return await ctx.runAction(internal.aiActions.generateSpeech, toolInput);
    default:
      return `Unknown tool: ${toolName}`;
  }
}
```

### Step Chaining via Convex Scheduler

After each step, the state machine mutation decides whether to auto-advance:

```typescript
// convex/sessions.ts
export const updateState = internalMutation({
  args: { sessionId: v.id("sessions"), state: v.string(), stateMessage: v.string() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.sessionId, {
      state: args.state,
      stateMessage: args.stateMessage,
    });

    // Auto-advance for non-blocking states
    const autoAdvanceStates = ["template_selecting", "phase_generating", "phase_implementing",
                               "deploying", "validating", "finalizing", "reviewing"];
    if (autoAdvanceStates.includes(args.state)) {
      await ctx.scheduler.runAfter(0, internal.pipeline.executeStep, {
        sessionId: args.sessionId
      });
    }
    // Blocking states: "blueprinting" (awaits approval), "complete" (awaits user), "failed" (awaits retry)
  },
});
```

### Blueprint Approval Flow (Event-Driven)

1. Pipeline action generates blueprint, writes to Convex, sets state to `blueprinting` → **action ends**
2. Frontend subscribes to session, shows blueprint card with Approve/Request Changes buttons
3. User clicks "Approve" → frontend calls mutation `api.blueprints.approve`
4. Mutation sets `approved: true`, updates session state to `template_selecting`, and schedules next pipeline step via `ctx.scheduler.runAfter(0, internal.pipeline.executeStep, { sessionId })`
5. No polling. No long connection. Fully event-driven.

### Phase Creation

When the `phase_generating` step runs, it creates a phase document in the `phases` table:

```typescript
await ctx.runMutation(internal.phases.create, {
  sessionId,
  index: session.currentPhaseIndex,
  name: phaseConcept.name,
  description: phaseConcept.description,
  status: "generating",
  files: phaseConcept.files.map(f => ({ path: f.path, purpose: f.purpose, status: "pending" })),
  installCommands: phaseConcept.installCommands,
});
```

### Event Delivery

Frontend receives ALL events via **Convex subscriptions** (no SSE):
- `useQuery(api.sessions.get, { sessionId })` — state, progress, preview URL
- `useQuery(api.messages.list, { sessionId })` — conversation history
- `useQuery(api.phases.list, { sessionId })` — phase timeline with file status
- `useQuery(api.generatedFiles.list, { sessionId })` — file contents for code editor

Each pipeline step writes status messages to the `messages` table, which the frontend picks up reactively. Therapists see clear progress updates ("Planning phase 2...", "Generating TokenBoard component...") rather than raw LLM tokens.

### Authentication

API routes validate that the caller owns the session:
- `POST /api/agent/build` — no auth needed (creates new session, returns sessionId)
- `POST /api/agent/approve`, `/message` — validate sessionId belongs to the caller (Clerk userId when auth is added; for now, sessionId acts as a bearer token since it's a UUID)
- Pipeline actions use `internalAction`/`internalMutation` — not callable from the client, only from other Convex functions and the scheduler

---

## 6. E2B Templates & Dynamic Selection

### Template Catalog (4 therapy templates)

| Template | Use Case | Pre-built Components |
|----------|----------|---------------------|
| `therapy-communication` | Communication boards, PECS, AAC | Board grid layout, TTS integration, card components, sentence strip |
| `therapy-behavior` | Token boards, reinforcement systems, timers | Token display, progress bars, celebration animations, countdown timer |
| `therapy-schedule` | Visual schedules, first-then boards, routines | Step list, drag-reorder, checkmarks, transition cues |
| `therapy-academic` | Matching games, sorting tasks, choice activities | Drag-drop zones, scoring, feedback animations, prompt levels |

### Shared Across All Templates

- `therapy-ui.css` design system (`.card-interactive`, `.tap-target`, `.token-star`, etc.)
- Nunito (headings) + Inter (body) fonts
- `useLocalStorage` hook for device persistence
- `useTherapyData` hook (placeholder for cloud sync)
- `accessibility.css` — minimum 44px touch targets, high contrast mode, reduced motion support
- Tailwind v4 + React 19

### Template Selection Flow

1. Agent has the approved TherapyBlueprint
2. Agent calls `select_template` tool with blueprint summary
3. Tool uses a lightweight LLM call (or rule-based matching on `interactionModel` + `reinforcementStrategy`) to pick the best template
4. Template files are loaded and injected into the E2B sandbox
5. Phase generation is template-aware — the system prompt includes the template's file tree and available components

### Template Storage

Templates live in `e2b-templates/` directory, each registered with E2B as a separate template ID. The `select_template` tool has a registry mapping template names to E2B IDs.

### Multi-File Writes

Each phase can write multiple files (key change from current single-file system):

```typescript
async function deployToSandbox(args: { sessionId: string, files: FileOutput[] }) {
  const sandbox = await Sandbox.connect(sandboxId);

  for (const file of args.files) {
    const fullPath = `/home/user/app/${file.filePath}`;
    await sandbox.files.write(fullPath, file.fileContents);
  }

  for (const cmd of args.commands) {
    await sandbox.commands.run(cmd, { cwd: "/home/user/app" });
  }

  await sleep(2000); // Wait for Vite HMR

  return { previewUrl: `https://${sandbox.getHost(5173)}` };
}
```

---

## 7. Version History

### Convex `files` Table

```typescript
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
  .index("by_phase", ["phaseId"])
```

### Convex `versions` Table

```typescript
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

  // Snapshot — references to files table, NOT inline contents (avoids 1MB doc limit)
  fileRefs: v.array(v.id("files")),  // File IDs at this version point

  // Diff from previous version (lightweight — paths and actions only)
  diff: v.array(v.object({
    path: v.string(),
    action: v.union(v.literal("added"), v.literal("modified"), v.literal("deleted")),
  })),

  // Metadata
  phaseIndex: v.optional(v.number()),
  fileCount: v.number(),
  timestamp: v.number(),
}).index("by_session", ["sessionId"])
  .index("by_session_version", ["sessionId", "version"])
```

### How Versioning Works

1. After each phase completes, the `savePhaseResult` tool:
   - Reads all current files from the `files` table for this session
   - Computes diff against the previous version's `fileSnapshot`
   - Creates a new `versions` entry with the full snapshot + diff
2. Frontend shows a version timeline: "v1: Layout & structure → v2: Token animations → v3: TTS integration"
3. **Undo** = restore a previous version's `fileSnapshot` to the `files` table + redeploy to E2B
4. **"What changed?"** = read the `diff` array for any version and show added/modified/deleted files

### Version Limit

Keep last 20 versions per session. Older versions have their `fileRefs` array cleared (set to empty — the referenced file documents remain for other versions that need them). The `diff` metadata is kept for history display. Cleanup runs as part of the `savePhaseResult` pipeline step — after creating a new version, check if count > 20 and prune the oldest.

---

## 8. Validation Loop

### Post-Phase Validation

After each phase deploys to E2B:

```
Deploy to sandbox
  → Collect runtime errors (E2B console/process errors)
  → Check: did Vite build succeed? (exit code + stderr)
  → Check: are there React render errors? (console errors matching known patterns)
  → If clean: mark phase completed, move on
  → If errors:
      1. Agent calls regenerate_file with error context (max 2 fix attempts per phase)
      2. Redeploy
      3. Re-validate
      4. If still broken after 2 attempts: mark phase as completed-with-warnings, continue
```

### Error Patterns Caught

- Vite build failures (missing imports, syntax errors)
- React render errors ("Cannot read properties of undefined", "Maximum update depth exceeded")
- Missing dependency errors ("Module not found")
- CSS/Tailwind class errors

### What We Skip (simpler than VibeSDK)

- No static analysis (TypeScript type checking, ESLint) — E2B catches most issues at runtime
- No screenshot analysis — VibeSDK uses Cloudflare Browser Rendering; overkill for now
- No deep debugger sub-agent — fixes handled inline by the main agent

---

## 9. Frontend UX

### Builder Page — Three-Panel Layout

```
┌──────────────────────────────────────────────────────────┐
│  Header: App title | State badge | Version dropdown      │
├────────────┬─────────────────────┬───────────────────────┤
│            │                     │                       │
│  CHAT      │  CODE EDITOR        │  LIVE PREVIEW         │
│  PANEL     │  (Monaco/readonly)  │  (E2B iframe)         │
│            │                     │                       │
│  Messages  │  File explorer      │  Preview URL          │
│  Blueprint │  Phase files        │  Responsive toggle    │
│  preview   │  Syntax highlight   │  (mobile/tablet/      │
│  Phase     │                     │   desktop)            │
│  timeline  │                     │                       │
│            │                     │                       │
├────────────┴─────────────────────┴───────────────────────┤
│  Phase Timeline Bar: [# Layout # Interactions # Data . Polish]  │
└──────────────────────────────────────────────────────────┘
```

### UI States Driven by Convex Subscriptions

| Session State | Chat Panel | Code Panel | Preview Panel |
|--------------|-----------|-----------|--------------|
| `idle` | Welcome + prompt input | Empty | Placeholder |
| `blueprinting` | Streaming blueprint preview card | Empty | Placeholder |
| `blueprinting` (done) | Blueprint card + "Approve" / "Request changes" buttons | Empty | Placeholder |
| `template_selecting` | "Selecting best template..." | Template file tree loading | Placeholder |
| `phase_generating` | "Planning phase N..." with file list appearing | Phase spec preview | Previous preview |
| `phase_implementing` | "Generating src/components/X.tsx..." | File contents streaming in | Previous preview |
| `deploying` | "Deploying to preview..." | All phase files | Loading spinner on iframe |
| `validating` | "Checking for errors..." / "Fixing: [error]" | Error highlights | Live preview updating |
| `complete` | "Your app is ready!" + follow-up input | Full file tree browsable | Live working preview |

### Phase Timeline Bar

Horizontal progress bar at the bottom. Each segment shows phase name + status (gray=pending, blue=active, green=complete, red=failed). Clicking a phase scrolls the code editor to that phase's files.

### App Blueprint Approval Card

When state is `blueprinting` and the blueprint is ready, the chat panel shows a structured card:

```
┌─────────────────────────────────────┐
│  App Blueprint                      │
│                                     │
│  Morning Routine Visual Schedule    │
│                                     │
│  Goal: Executive function — task    │
│  sequencing and completion          │
│  Skill: Following multi-step        │
│  morning routines independently     │
│  Ages: Preschool - School-age       │
│  Interaction: Drag to reorder +     │
│  tap to complete                    │
│  Reinforcement: Star tokens (5)     │
│  with celebration animation         │
│  Tracking: Steps completed,         │
│  time to completion, prompts needed │
│                                     │
│  Phases: 4 planned                  │
│  1. Layout & step cards             │
│  2. Drag-reorder + completion       │
│  3. Token rewards + celebration     │
│  4. Data tracking + persistence     │
│                                     │
│  [Looks Good]  [Request Changes]    │
└─────────────────────────────────────┘
```

---

## 10. Dependency Changes

### Removed

| Package | Reason |
|---------|--------|
| `@convex-dev/agent` | Replaced by custom agent loop with Anthropic SDK |
| `@ai-sdk/anthropic` | Replaced by direct `@anthropic-ai/sdk` usage |
| `@assistant-ui/react` | Chat UI rebuilt with direct Convex subscriptions |

**Note on `ai` (Vercel AI SDK):** The core `ai` package may need to stay as a dependency if `@convex-dev/rag` requires it internally for embeddings. Verify during implementation — if RAG works without it, remove. If not, keep as an indirect dependency only.

### Added

| Package | Purpose |
|---------|---------|
| `@anthropic-ai/sdk` | Anthropic Messages API for LLM calls (may already be installed as transitive dep) |
| `diff` | Computing human-readable diffs for version history |

### Kept (unchanged)

| Package | Purpose |
|---------|---------|
| `convex` | Backend — now pure persistence + real-time |
| `@convex-dev/rag` | RAG knowledge base (still uses Gemini embeddings) |
| `@ai-sdk/google` | Gemini embeddings for RAG (used by `@convex-dev/rag` internally) |
| `@e2b/code-interpreter` | Sandbox execution |
| `elevenlabs` | TTS for communication apps |
| `next`, `react`, `react-dom` | Frontend framework |
| `motion`, `zustand`, `@dnd-kit/react` | UI interactions |
| All shadcn/ui components | Design system |
| `use-sound`, `sonner`, `lucide-react` | UI utilities |
| `zod` (v4.3.6) | Schema validation (already installed) |

---

## 11. Convex Schema Changes

| Table | Action |
|-------|--------|
| `sessions` | **NEW** — replaces thread-based agent model |
| `messages` | **NEW** — conversation messages (separate from session to avoid 1MB limit) |
| `agentContext` | **NEW** — LLM conversation history per session (separate to avoid 1MB limit) |
| `blueprints` | **NEW** — therapy-structured PRDs |
| `phases` | **NEW** — phase tracking with file status |
| `files` | **NEW** — generated file contents per session |
| `versions` | **NEW** — snapshot history with diffs |
| `apps` | **RENAMED** from `tools` — published apps with share slugs |
| `appState` | **RENAMED** from `toolState` — key-value state per app |
| `therapyTemplates` | **KEPT** — starter prompts |
| `knowledgeBase` | **KEPT** — RAG entries |
| `ttsCache` | **KEPT** — ElevenLabs audio cache |
| `projects` | **REMOVED** — replaced by `sessions` |

### Phases Table Schema

```typescript
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
  .index("by_session_index", ["sessionId", "index"])
```

---

## 12. File System Changes

### Removed

- `convex/agents/` — entire directory
- `convex/chat/` — entire directory
- `src/features/therapy-tools/` — entire directory
- `src/features/builder-v2/components/chat.tsx` — current chat
- `src/app/api/chat/` — current API routes

### Created

- `src/app/api/agent/build/route.ts` — thin entry: create session, schedule pipeline
- `src/app/api/agent/approve/route.ts` — thin entry: approve blueprint via mutation
- `src/app/api/agent/message/route.ts` — thin entry: follow-up message via mutation
- `src/lib/agent/prompts/` — system prompts (blueprint, phase gen, phase impl)
- `src/lib/agent/schemas/` — Zod schemas (TherapyBlueprintSchema, PhaseConceptSchema, etc.)
- `src/features/builder/` — rebuilt builder page (3-panel layout)
- `src/features/builder/components/` — chat panel, code editor, preview, phase timeline, blueprint card
- `convex/pipeline.ts` — `"use node";` internalAction: executeStep dispatcher + per-state handlers
- `convex/pipeline_tools.ts` — Anthropic tool definitions + executeToolCall handler
- `convex/pipeline_prompts.ts` — system prompts for each pipeline step
- `convex/sessions.ts` — session CRUD + state machine mutations + scheduler chaining
- `convex/messages.ts` — conversation message CRUD
- `convex/agent_context.ts` — agent conversation context persistence + compaction
- `convex/blueprints.ts` — blueprint CRUD + approval
- `convex/phases.ts` — phase tracking
- `convex/generated_files.ts` — file management
- `convex/versions.ts` — version history
- `convex/apps.ts` — renamed from tools.ts

---

## 13. Terminology Changes

| Old | New | Scope |
|-----|-----|-------|
| tool | app | Everywhere: UI copy, code, database, URLs |
| Tool Blueprint | App Blueprint | UI, schema names |
| therapy tool | therapy app | UI copy, prompts, docs |
| `tools` table | `apps` table | Convex schema |
| `toolState` table | `appState` table | Convex schema |
| `createTool` / `updateTool` | `createApp` / `updateApp` | Agent tools, mutations |
| `src/features/therapy-tools/` | Removed entirely — replaced by `src/features/builder/` with full code gen architecture | Feature directory |
| `/builder` output | "app" | UI, published at `/apps/:slug` |

---

## 14. Future Considerations

Items explicitly deferred from this spec:

- **Convex Workpool** — for concurrent build queuing and durability when scaling to multiple users
- **Agentic behavior mode** — LLM-driven orchestration as an advanced option alongside phasic
- **Static analysis** — TypeScript type checking + ESLint in sandbox for higher code quality
- **Screenshot analysis** — AI-powered visual QA of generated UIs
- **Deep debugger sub-agent** — Dedicated debugging agent (like VibeSDK's Gemini 2.5 Pro debugger)
- **Git clone export** — isomorphic-git for users who want to download their app's source
- **Cloudflare Workers deployment** — production deploy target beyond Vercel
- **Multi-model support** — OpenAI, Gemini as alternative LLM providers
- **SSE streaming** — if step-based updates feel too coarse, add SSE streaming within individual steps for real-time token output

---

## 15. Implementation Warnings

Issues to verify during implementation:

1. **`@convex-dev/rag` dependency chain:** RAG internally uses `ai` (Vercel AI SDK) and `@ai-sdk/google` for embeddings. Verify that removing `ai` from top-level dependencies doesn't break RAG. If it does, keep `ai` as an indirect dependency.

2. **Four E2B templates need building:** Only `vite-therapy` exists today. Building, testing, and registering `therapy-communication`, `therapy-behavior`, `therapy-schedule`, and `therapy-academic` is significant work. Consider starting with one (expand `vite-therapy`) and adding others incrementally.

3. **Zod version:** Current project uses Zod v4.3.6 but `@convex-dev/agent` tools used `zod/v3`. Standardize on Zod v4 for all new schemas. Verify Anthropic SDK tool schemas work with Zod v4 if using Zod-to-JSON-schema conversion.

4. **Rate limiting:** Multi-phase builds make 10-20+ Claude API calls each. Add per-session rate limiting before the vibeathon demo to prevent runaway costs. Consider a simple counter in the session table.

5. **Convex `v.any()` fields:** `blueprints.blueprint`, `sessions.agentContext`, and `phases.concept` use `v.any()`. Validate these with Zod on the application side, but be aware that schema drift is invisible to Convex. Consider explicit validators for the most critical fields after the architecture stabilizes.

6. **`agentContext` serialization size:** The Anthropic Messages API conversation history can grow large (especially with code generation responses). Monitor the size of `agentContext` in the sessions table. If it approaches 1MB, implement conversation compaction (summarize older messages) similar to VibeSDK's `conversationCompactifier`.
